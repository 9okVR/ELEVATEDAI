// @ts-nocheck
// Deno Edge Function: Leave a class (remove membership). Teachers must delete the class instead.
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
  const class_id = String(body?.class_id || '').trim();
  if (!class_id) return bad(400, "Missing class_id");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return bad(401, "Unauthorized");

  // Prevent teacher from leaving their own class (must delete)
  const { data: cls } = await supabase.from('classes').select('teacher_id').eq('id', class_id).maybeSingle();
  if (!cls) return bad(404, "Class not found");
  if (cls.teacher_id === user.id) return bad(400, "Teachers cannot leave their own class. Delete it instead.");

  const { error } = await supabase.from('class_members').delete().eq('class_id', class_id).eq('user_id', user.id);
  if (error) return bad(500, `Leave failed: ${error.message}`);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

