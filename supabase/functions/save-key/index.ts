// Deno Edge Function: Save and encrypt a user's Gemini API key (with CORS)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read secrets (support both SB_* and legacy names)
const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENC_KEY_B64 = Deno.env.get("SB_ENCRYPTION_KEY") ?? Deno.env.get("ENCRYPTION_KEY")!; // 32 bytes base64

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function encrypt(plaintext: string) {
  const keyRaw = Uint8Array.from(atob(ENC_KEY_B64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext))
  );
  // Store iv||ct base64
  return btoa(String.fromCharCode(...iv, ...ct));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { apiKey } = await req.json().catch(() => ({}));
    if (!apiKey) return new Response("Missing apiKey", { status: 400, headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const ciphertext = await encrypt(apiKey);
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, gemini_api_key_ciphertext: ciphertext, updated_at: new Date().toISOString() });
    if (error) throw error;

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (_e) {
    return new Response("Error saving key", { status: 500, headers: corsHeaders });
  }
});
