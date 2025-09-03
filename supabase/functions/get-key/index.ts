// @ts-nocheck
// Deno Edge Function: Return whether a user API key exists; optionally reveal it (with CORS)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Read secrets (support both SB_* and legacy names)
const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENC_KEY_B64 = Deno.env.get("SB_ENCRYPTION_KEY") ?? Deno.env.get("ENCRYPTION_KEY"); // 32 bytes base64

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const bad = (status: number, msg: string) => new Response(msg, { status, headers: corsHeaders });

async function decrypt(b64: string): Promise<string> {
  if (!ENC_KEY_B64) throw new Error("Missing ENCRYPTION_KEY/SB_ENCRYPTION_KEY secret");
  const all = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = all.slice(0, 12);
  const ct = all.slice(12);
  const keyRawB = atob(ENC_KEY_B64);
  if (keyRawB.length !== 32) throw new Error(`ENCRYPTION_KEY must decode to 32 bytes, got ${keyRawB.length}`);
  const keyRaw = Uint8Array.from(keyRawB, (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    if (!SUPABASE_URL) return bad(500, "Missing SUPABASE_URL/SB_PROJECT_URL secret");
    if (!SERVICE_ROLE_KEY) return bad(500, "Missing SUPABASE_SERVICE_ROLE_KEY/SB_SERVICE_ROLE_KEY secret");

    const authHeader = req.headers.get("Authorization") || "";

    // reveal can be provided via query (?reveal=1) or body { reveal: true }
    const url = new URL(req.url);
    let reveal = url.searchParams.get("reveal") === "1" || url.searchParams.get("reveal") === "true";
    if (!reveal && (req.method === "POST" || req.method === "PUT")) {
      const body = await req.json().catch(() => ({}));
      reveal = Boolean(body?.reveal);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return bad(401, "Unauthorized");

    const { data: settings } = await supabase
      .from("user_settings")
      .select("gemini_api_key_ciphertext")
      .eq("user_id", user.id)
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ hasKey: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!reveal) {
      return new Response(JSON.stringify({ hasKey: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = await decrypt(settings.gemini_api_key_ciphertext);
    return new Response(JSON.stringify({ hasKey: true, apiKey }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("get-key error:", e);
    return bad(500, `Error getting key: ${(e as Error)?.message || e}`);
  }
});
