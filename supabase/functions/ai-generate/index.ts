// @ts-nocheck
// Deno Edge Function: Call Gemini using the user's stored API key (with CORS)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";
import { GoogleAIFileManager } from "https://esm.sh/@google/generative-ai@0.24.1/server";

// Read secrets (support both SB_* and legacy names)
const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENC_KEY_B64 = Deno.env.get("SB_ENCRYPTION_KEY") ?? Deno.env.get("ENCRYPTION_KEY")!; // 32 bytes base64

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Small sleep helper for retries
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function decrypt(b64: string) {
  const all = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = all.slice(0, 12);
  const ct = all.slice(12);
  const keyRaw = Uint8Array.from(atob(ENC_KEY_B64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const authHeader = req.headers.get("Authorization") || "";
  try {
    const { prompt, model = "gemini-2.5-flash", expectJson = false, action, items, docBytes, doc } = await req.json().catch(() => ({}));
    if (!prompt || !action) return new Response("Missing prompt/action", { status: 400, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const { data: settings } = await supabase
      .from("user_settings")
      .select("gemini_api_key_ciphertext")
      .eq("user_id", user.id)
      .single();
    if (!settings) return new Response("No API key saved", { status: 400, headers: corsHeaders });

    const apiKey = await decrypt(settings.gemini_api_key_ciphertext);
    const genai = new GoogleGenerativeAI(apiKey);
    // Force JSON for certain actions even if caller forgot expectJson
    const jsonActions = new Set(["syllabus", "quiz-adaptive", "distractor-analysis", "flashcards", "quiz"]);
    const needsJson = Boolean(expectJson || (action && jsonActions.has(String(action))));
    const generationConfig = needsJson
      ? { temperature: 0.7, maxOutputTokens: 4096, responseMimeType: "application/json" }
      : { temperature: 0.7, maxOutputTokens: 3072, ...(action === 'extract' ? { responseMimeType: 'text/plain' } : {}) };

    // Try the requested model with backoff; on overload, fall back to alternates
    const primaryModel = model || "gemini-2.5-flash";
    const alternates = [
      "gemini-2.5-pro",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ].filter((m) => m !== primaryModel);

    const modelsToTry = [primaryModel, ...alternates];
    let text: string | null = null;
    let lastError: any = null;

    // Helper to construct contents with optional file support
    const buildContents = async () => {
      // If this is an extract action with a document, attach it properly
      if (action === 'extract' && doc && doc?.data && doc?.mimeType) {
        const mt = String(doc.mimeType);
        const parts: any[] = [{ text: prompt }];
        try {
          if (/^image\//i.test(mt)) {
            // Images: inlineData works
            parts.push({ inlineData: { data: String(doc.data), mimeType: mt } });
          } else if (/pdf/i.test(mt)) {
            // PDFs: prefer File API upload and reference by fileData
            const fm = new GoogleAIFileManager(apiKey);
            const bytes = Uint8Array.from(atob(String(doc.data)), c => c.charCodeAt(0));
            const file = new File([bytes], 'upload.pdf', { type: mt });
            const up = await fm.uploadFile(file, { mimeType: mt, displayName: 'User PDF' } as any);
            const uri = (up as any)?.file?.uri;
            if (uri) parts.push({ fileData: { mimeType: mt, fileUri: uri } });
            else parts.push({ inlineData: { data: String(doc.data), mimeType: mt } });
          } else {
            // Other types: try inline
            parts.push({ inlineData: { data: String(doc.data), mimeType: mt } });
          }
        } catch {
          parts.push({ inlineData: { data: String(doc.data), mimeType: mt } });
        }
        return [{ role: 'user', parts }];
      }
      return [{ role: 'user', parts: [{ text: prompt }] }];
    };

    for (const m of modelsToTry) {
      const client = genai.getGenerativeModel({ model: m });
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const contents = await buildContents();

          const res = await client.generateContent({ contents, generationConfig } as any);
          text = res.response.text();
          if (text) break;
        } catch (err) {
          lastError = err;
          const msg = String((err as Error)?.message || err);
          // Retries for transient overload/timeouts only
          const transient = /503|overloaded|Service Unavailable|timeout|temporarily/i.test(msg);
          if (transient && attempt < 2) {
            await sleep(400 * Math.pow(2, attempt));
            continue;
          }
          break; // non-transient or max attempts for this model
        }
      }
      if (text) break;
    }

    if (!text) {
      throw lastError || new Error("Model call failed");
    }

    await supabase.from("usage_logs").insert([
      { user_id: user.id, action, model, items: items ?? null, doc_bytes: docBytes ?? null, status: "ok" },
    ]);

    return new Response(JSON.stringify({ text }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("usage_logs").insert([{ user_id: user.id, action: "error", status: "error", error: String(e) }]);
    } catch {}
    const msg = (e as Error)?.message || String(e);
    // If it looks like a transient overload, reflect a 503 upstream so client can retry
    const transient = /503|overloaded|Service Unavailable|timeout|temporarily/i.test(msg);
    return new Response(`AI error: ${msg}`, { status: transient ? 503 : 500, headers: corsHeaders });
  }
});
