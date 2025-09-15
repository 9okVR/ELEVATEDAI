// @ts-nocheck
// Super-simple Deno Edge Function: uses the user's saved Gemini API key
// - Supports text-only prompts and optional file attachment (image/PDF)
// - Returns plain text by default, JSON when expectJson=true

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";
import { GoogleAIFileManager } from "https://esm.sh/@google/generative-ai@0.24.1/server";

// Secrets (SB_* or legacy names)
const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENC_KEY_B64 = Deno.env.get("SB_ENCRYPTION_KEY") ?? Deno.env.get("ENCRYPTION_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bad(status: number, msg: string) {
  return new Response(msg, { status, headers: corsHeaders });
}

async function decrypt(b64: string) {
  const all = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = all.slice(0, 12);
  const ct = all.slice(12);
  const keyRaw = Uint8Array.from(atob(ENC_KEY_B64!), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ENC_KEY_B64) {
    return bad(500, "Missing function secrets (SUPABASE_URL, SERVICE_ROLE_KEY, ENCRYPTION_KEY)");
  }

  const authHeader = req.headers.get("Authorization") || "";
  let body: any = {};
  try { body = await req.json(); } catch {}

  const prompt: string = body?.prompt ?? "";
  const action: string = body?.action ?? "chat"; // e.g. 'extract', 'chat', 'quiz', etc.
  const model: string = body?.model || "gemini-2.5-flash";
  const expectJson: boolean = Boolean(body?.expectJson);
  const doc = body?.doc as { mimeType: string; data: string } | undefined;
  const items = body?.items ?? null;
  const docBytes = body?.docBytes ?? null;

  if (!prompt || !action) return bad(400, "Missing prompt/action");

  try {
    // Auth and get user
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return bad(401, "Unauthorized");

    // Load and decrypt user's saved Gemini key
    const { data: settings } = await supabase
      .from("user_settings")
      .select("gemini_api_key_ciphertext")
      .eq("user_id", user.id)
      .single();
    if (!settings) return bad(400, "No API key saved");
    const apiKey = await decrypt(settings.gemini_api_key_ciphertext);

    // Build Gemini request
    const genai = new GoogleGenerativeAI(apiKey);
    const fm = new GoogleAIFileManager(apiKey);

    const parts: any[] = [{ text: prompt }];
    if (doc && typeof doc?.mimeType === "string" && typeof doc?.data === "string" && doc.data.length > 0) {
      const mt = String(doc.mimeType);
      if (/^image\//i.test(mt)) {
        parts.push({ inlineData: { mimeType: mt, data: doc.data } });
      } else if (/pdf/i.test(mt)) {
        // Upload PDF and reference by URI for best OCR
        try {
          const bytes = Uint8Array.from(atob(doc.data), (c) => c.charCodeAt(0));
          const file = new File([bytes], "upload.pdf", { type: mt });
          const up = await fm.uploadFile(file, { mimeType: mt, displayName: "User PDF" } as any);
          const uri = (up as any)?.file?.uri;
          if (uri) parts.push({ fileData: { mimeType: mt, fileUri: uri } });
          else parts.push({ inlineData: { mimeType: mt, data: doc.data } });
        } catch {
          parts.push({ inlineData: { mimeType: mt, data: doc.data } });
        }
      } else {
        parts.push({ inlineData: { mimeType: mt, data: doc.data } });
      }
    }

    const generationConfig: any = {
      temperature: 0.7,
      maxOutputTokens: 3072,
    };
    if (expectJson) generationConfig.responseMimeType = "application/json";
    else if (action === "extract") generationConfig.responseMimeType = "text/plain";

    const modelClient = genai.getGenerativeModel({ model, generationConfig });
    const res = await modelClient.generateContent({ contents: [{ role: "user", parts }] } as any);
    const text = res?.response?.text?.() ?? "";
    if (!text) return bad(500, "Empty response from model");

    // Log usage (best‑effort)
    try {
      await supabase.from("usage_logs").insert([{ user_id: user.id, action, model, items, doc_bytes: docBytes, status: "ok" }]);
    } catch {}

    return new Response(JSON.stringify({ text }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    return bad(500, `AI error: ${msg}`);
  }
});
