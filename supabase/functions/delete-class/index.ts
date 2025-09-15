// @ts-nocheck
// Deno Edge Function: Delete a class (teacher only)
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

  // Verify ownership
  const { data: cls } = await supabase.from('classes').select('id, teacher_id').eq('id', class_id).maybeSingle();
  if (!cls) return bad(404, "Class not found");
  if (cls.teacher_id !== user.id) return bad(403, "Only the teacher can delete the class");

  const { error } = await supabase.from('classes').delete().eq('id', class_id);
  if (error) return bad(500, `Delete failed: ${error.message}`);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

