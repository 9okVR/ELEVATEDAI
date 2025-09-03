// @ts-nocheck
// Deno Edge Function: Persist and read chat history, flashcards, and quizzes (with CORS)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secrets (accept SB_* or SUPABASE_*)
const SUPABASE_URL = Deno.env.get("SB_PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const bad = (status: number, msg: string) => new Response(msg, { status, headers: corsHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    if (!SUPABASE_URL) return bad(500, "Missing SUPABASE_URL/SB_PROJECT_URL secret");
    if (!SERVICE_ROLE_KEY) return bad(500, "Missing SUPABASE_SERVICE_ROLE_KEY/SB_SERVICE_ROLE_KEY secret");

    const authHeader = req.headers.get("Authorization") || "";
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    if (!action) return bad(400, "Missing action");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return bad(401, "Unauthorized");

    const uid = user.id;

    // Actions
    if (action === 'save_flashcards') {
      const items = body?.items;
      if (!Array.isArray(items)) return bad(400, 'items must be an array');
      const { data, error } = await supabase
        .from('flashcard_sets')
        .insert({ user_id: uid, items })
        .select('id')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'save_quiz') {
      const items = body?.items;
      const results = body?.results ?? null;
      if (!Array.isArray(items)) return bad(400, 'items must be an array');
      const { data, error } = await supabase
        .from('quizzes')
        .insert({ user_id: uid, items, results })
        .select('id')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create_session') {
      const flashcard_set_id = body?.flashcard_set_id ?? null;
      const quiz_id = body?.quiz_id ?? null;
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: uid, flashcard_set_id, quiz_id })
        .select('id')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'add_message') {
      const session_id = body?.session_id as string | undefined;
      const role = body?.role as string | undefined;
      const content = body?.content as string | undefined;
      if (!session_id || !role || !content) return bad(400, 'session_id, role, content required');
      // Verify ownership of the session
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id,user_id')
        .eq('id', session_id)
        .eq('user_id', uid)
        .single();
      if (!session) return bad(404, 'Session not found');

      const { error } = await supabase
        .from('chat_messages')
        .insert({ session_id, user_id: uid, role, content });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list_sessions') {
      const limit = Math.min(Math.max(parseInt(body?.limit ?? '20'), 1), 100);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, created_at, flashcard_set_id, quiz_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return new Response(JSON.stringify({ sessions: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_session') {
      const id = body?.id as string | undefined;
      if (!id) return bad(400, 'id required');
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id, created_at, flashcard_set_id, quiz_id')
        .eq('id', id)
        .eq('user_id', uid)
        .single();
      if (!session) return bad(404, 'Not found');

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('session_id', id)
        .order('created_at', { ascending: true });

      let flashcards = null, quiz = null;
      if (session.flashcard_set_id) {
        const { data } = await supabase
          .from('flashcard_sets')
          .select('items, created_at')
          .eq('id', session.flashcard_set_id)
          .eq('user_id', uid)
          .single();
        flashcards = data ?? null;
      }
      if (session.quiz_id) {
        const { data } = await supabase
          .from('quizzes')
          .select('items, results, created_at')
          .eq('id', session.quiz_id)
          .eq('user_id', uid)
          .single();
        quiz = data ?? null;
      }

      return new Response(JSON.stringify({ session, messages, flashcards, quiz }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return bad(400, 'Unknown action');
  } catch (e) {
    console.error('history error:', e);
    return bad(500, `Error: ${(e as Error)?.message || e}`);
  }
});

