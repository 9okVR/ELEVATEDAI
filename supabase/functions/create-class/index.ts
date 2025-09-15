// @ts-nocheck
// Deno Edge Function: Create a class for the current user (teacher)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function bad(status: number, msg: string) { return new Response(msg, { status, headers: corsHeaders }); }

function genCode(len = 6) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  let s = ""; for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return bad(500, "Missing SUPABASE_URL/SERVICE_ROLE_KEY");

  const authHeader = req.headers.get("Authorization") || "";
  let body: any = {}; try { body = await req.json(); } catch {}
  const name = String(body?.name || '').trim();
  if (!name) return bad(400, "Missing name");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad(401, "Unauthorized");

  // generate unique join code (retry up to 10 times)
  let join_code = genCode();
  for (let i = 0; i < 10; i++) {
    const { data: exists } = await supabase.from('classes').select('id').eq('join_code', join_code).maybeSingle();
    if (!exists) break; else join_code = genCode();
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({ teacher_id: user.id, name, join_code })
    .select('id, name, join_code')
    .single();
  if (error) return bad(500, `Insert failed: ${error.message}`);
  return new Response(JSON.stringify({ ok: true, class: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

