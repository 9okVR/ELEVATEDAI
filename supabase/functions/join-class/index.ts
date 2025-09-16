// @ts-nocheck
// Deno Edge Function: Join a class by join_code for the current user
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return bad(500, "Missing SUPABASE_URL/SERVICE_ROLE_KEY");

  const authHeader = req.headers.get("Authorization") || "";
  let body: any = {}; try { body = await req.json(); } catch {}
  // Sanitize: remove spaces/dashes and normalize case
  let join_code = String(body?.join_code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!join_code) return bad(400, "Missing join_code");

  // Use one client with the user's auth header to read the session (auth.getUser),
  // and a second admin client WITHOUT the Authorization header to bypass RLS
  // for the class lookup + membership upsert (validated via join_code).
  const authed = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return bad(401, "Unauthorized");

  let { data: cls } = await admin.from('classes').select('id, name, join_code').eq('join_code', join_code).maybeSingle();
  if (!cls) {
    // Fallback case-insensitive match (handles any legacy lowercase codes)
    const { data: alt } = await admin.from('classes').select('id, name, join_code').ilike('join_code', join_code).maybeSingle();
    cls = alt as any;
  }
  if (!cls) return bad(404, "Class not found. Double-check the code and try again.");

  // Upsert membership as student
  const { error } = await admin
    .from('class_members')
    .upsert({ class_id: cls.id, user_id: user.id, role: 'student' }, { onConflict: 'class_id,user_id' });
  if (error) return bad(500, `Join failed: ${error.message}`);

  return new Response(JSON.stringify({ ok: true, class: cls }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
