// Deno Edge Function: Call Gemini using the user's stored API key
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";
import { GoogleAIFileManager } from "https://esm.sh/@google/generative-ai@0.24.1/server";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENC_KEY_B64 = Deno.env.get("ENCRYPTION_KEY")!; // 32 bytes base64

async function decrypt(b64: string) {
  const all = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = all.slice(0, 12);
  const ct = all.slice(12);
  const keyRaw = Uint8Array.from(atob(ENC_KEY_B64), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  try {
    const { prompt, model = 'gemini-2.5-flash', expectJson = false, action, items, docBytes, doc } = await req.json().catch(() => ({}));
    if (!prompt || !action) return new Response("Missing prompt/action", { status: 400 });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { data: settings } = await supabase
      .from('user_settings')
      .select('gemini_api_key_ciphertext')
      .eq('user_id', user.id)
      .single();
    if (!settings) return new Response("No API key saved", { status: 400 });

    const apiKey = await decrypt(settings.gemini_api_key_ciphertext);
    const genai = new GoogleGenerativeAI(apiKey);
    const modelClient = genai.getGenerativeModel({ model, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } });

    // Build parts to support optional file (image/PDF) input
    const parts: any[] = [{ text: prompt }];
    if (doc && typeof doc === 'object' && typeof doc.mimeType === 'string' && typeof doc.data === 'string' && doc.data.length > 0) {
      const isPdf = /pdf/i.test(doc.mimeType);
      const isImage = /^image\//i.test(doc.mimeType);
      if (isImage) {
        // Images: inlineData works
        parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
      } else if (isPdf) {
        // PDFs: upload to the File API, then reference via fileData
        try {
          const fm = new GoogleAIFileManager(apiKey);
          const bytes = Uint8Array.from(atob(doc.data), c => c.charCodeAt(0));
          // Deno supports File/Blob
          const file = new File([bytes], "upload.pdf", { type: doc.mimeType });
          const up = await fm.uploadFile(file, { mimeType: doc.mimeType, displayName: "User PDF" } as any);
          const fileUri = (up as any)?.file?.uri;
          if (fileUri) {
            parts.push({ fileData: { mimeType: doc.mimeType, fileUri } });
          } else {
            // Fallback to inlineData if upload fails to provide a URI
            parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
          }
        } catch {
          // Graceful fallback to inlineData
          parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
        }
      } else {
        // Other types: try inlineData
        parts.push({ inlineData: { mimeType: doc.mimeType, data: doc.data } });
      }
    }

    // Use structured contents call for consistency; add JSON MIME type when requested
    const payload = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        ...(expectJson ? { responseMimeType: 'application/json' } : {}),
        ...(action === 'extract' ? { responseMimeType: 'text/plain' } : {})
      }
    } as const;

    const result = await modelClient.generateContent(payload as any);
    const text = result.response.text();

    // Simple usage log
    await supabase.from('usage_logs').insert([{ user_id: user.id, action, model, items: items ?? null, doc_bytes: docBytes ?? null, status: 'ok' }]);

    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('usage_logs').insert([{ user_id: user.id, action: 'error', status: 'error', error: String(e) }]);
    } catch {}
    return new Response('AI error', { status: 500 });
  }
});
