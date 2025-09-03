// @ts-nocheck
// Deno Edge Function: Save and encrypt a user's Gemini API key (with CORS)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read secrets (support both SB_* and legacy names)
const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENC_KEY_B64 = Deno.env.get("SB_ENCRYPTION_KEY") ?? Deno.env.get("ENCRYPTION_KEY"); // 32 bytes base64

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const bad = (status: number, msg: string) => new Response(msg, { status, headers: corsHeaders });

async function encrypt(plaintext: string) {
  if (!ENC_KEY_B64) throw new Error("Missing ENCRYPTION_KEY/SB_ENCRYPTION_KEY secret");
  let raw: Uint8Array;
  try {
    const decoded = atob(ENC_KEY_B64);
    if (decoded.length !== 32) throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${decoded.length}`);
    raw = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  } catch (e) {
    throw new Error(`Invalid ENCRYPTION_KEY: ${(e as Error).message || e}`);
  }
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
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
    if (!SUPABASE_URL) return bad(500, "Missing SUPABASE_URL/SB_PROJECT_URL secret");
    if (!SERVICE_ROLE_KEY) return bad(500, "Missing SUPABASE_SERVICE_ROLE_KEY/SB_SERVICE_ROLE_KEY secret");

    const authHeader = req.headers.get("Authorization") || "";
    const { apiKey } = await req.json().catch(() => ({}));
    if (!apiKey) return bad(400, "Missing apiKey");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!user) return bad(401, "Unauthorized");

    const ciphertext = await encrypt(apiKey);
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, gemini_api_key_ciphertext: ciphertext, updated_at: new Date().toISOString() });
    if (error) throw error;

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (e) {
    console.error("save-key error:", e);
    return bad(500, `Error saving key: ${(e as Error)?.message || e}`);
  }
});
