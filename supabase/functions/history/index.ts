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

// Helper: derive a short, human-friendly title from first user message
function deriveTitle(text: string, maxLen = 80): string {
  try {
    let t = String(text || "");
    // Collapse whitespace and strip rudimentary markdown fences
    t = t.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1");
    t = t.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
    // Take first sentence-ish break
    const stop = Math.min(
      ...[". ", "? ", "! ", "\n"].map((s) => {
        const i = t.indexOf(s);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i + s.length - 1;
      })
    );
    if (stop !== Number.MAX_SAFE_INTEGER) t = t.slice(0, stop);
    if (t.length > maxLen) t = t.slice(0, maxLen - 1) + "…";
    return t || "New chat";
  } catch {
    return "New chat";
  }
}

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
      const grade_level = Number.isInteger(body?.grade_level) ? body.grade_level : null;
      const title = typeof body?.title === 'string' && body.title.trim() ? String(body.title).slice(0, 120) : null;
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: uid, flashcard_set_id, quiz_id, grade_level, title })
        .select('id')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ id: data.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update_session') {
      const id = body?.id as string | undefined;
      if (!id) return bad(400, 'id required');
      // Verify ownership
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id,user_id')
        .eq('id', id)
        .eq('user_id', uid)
        .single();
      if (!session) return bad(404, 'Session not found');

      const patch: Record<string, any> = {};
      if (typeof body.flashcard_set_id === 'string') patch.flashcard_set_id = body.flashcard_set_id;
      if (typeof body.quiz_id === 'string') patch.quiz_id = body.quiz_id;
      if (typeof body.topics === 'string') patch.topics = body.topics;
      if (body.topics_sources !== undefined) patch.topics_sources = body.topics_sources;
      if (Array.isArray(body.documents)) patch.documents = body.documents;
      if (Number.isInteger(body?.grade_level)) patch.grade_level = body.grade_level;
      if (body?.grade_level === null) patch.grade_level = null;
      if (typeof body.title === 'string') patch.title = body.title.slice(0, 120);
      if (Object.keys(patch).length === 0) return bad(400, 'No fields to update');

      const { error } = await supabase
        .from('chat_sessions')
        .update(patch)
        .eq('id', id)
        .eq('user_id', uid);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'add_message') {
      const session_id = body?.session_id as string | undefined;
      const role = body?.role as string | undefined;
      const content = body?.content as string | undefined;
      if (!session_id || !role || !content) return bad(400, 'session_id, role, content required');
      // Verify ownership of the session
      let supportsSummary = true;
      let { data: session, error: sessErr } = await supabase
        .from('chat_sessions')
        .select('id,user_id,title,message_count')
        .eq('id', session_id)
        .eq('user_id', uid)
        .single();
      if (sessErr) {
        // Fallback for schemas without the new columns
        supportsSummary = false;
        const fallback = await supabase
          .from('chat_sessions')
          .select('id,user_id')
          .eq('id', session_id)
          .eq('user_id', uid)
          .single();
        session = fallback.data as any;
      }
      if (!session) return bad(404, 'Session not found');

      const { error } = await supabase
        .from('chat_messages')
        .insert({ session_id, user_id: uid, role, content });
      if (error) throw error;
      // Update session summary fields
      if (supportsSummary) {
        const patch: Record<string, any> = {
          last_message_at: new Date().toISOString(),
          message_count: (session as any)?.message_count != null ? (session as any).message_count + 1 : 1,
        };
        if (!(session as any)?.title || String((session as any).title).trim() === '') {
          if (role === 'user') patch.title = deriveTitle(content);
        }
        const { error: updErr } = await supabase
          .from('chat_sessions')
          .update(patch)
          .eq('id', session_id)
          .eq('user_id', uid);
        if (updErr) throw updErr;
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list_sessions') {
      const limit = Math.min(Math.max(parseInt(body?.limit ?? '20'), 1), 100);
      let { data, error } = await supabase
        .from('chat_sessions')
        .select('id, created_at, flashcard_set_id, quiz_id, grade_level, title, last_message_at, message_count')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) {
        // Fallback for older schema without new columns
        const fallback = await supabase
          .from('chat_sessions')
          .select('id, created_at, flashcard_set_id, quiz_id, grade_level')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(limit);
        data = fallback.data as any;
        error = fallback.error as any;
      }
      if (error) throw error;
      return new Response(JSON.stringify({ sessions: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'import_sessions') {
      const sessions = (body?.sessions || body?.bundle?.sessions) as any[] | undefined;
      if (!Array.isArray(sessions) || sessions.length === 0) return bad(400, 'sessions array required');
      const results: Array<{ external_id?: string; session_id?: string; ok: boolean; error?: string }>=[];
      for (const entry of sessions) {
        try {
          const s = entry?.session || {};
          const extId = String(s?.id ?? '').slice(0, 64) || undefined;
          // Deduplicate by (user_id, external_id)
          if (extId) {
            const { data: exists } = await supabase
              .from('chat_sessions')
              .select('id')
              .eq('user_id', uid)
              .eq('external_id', extId)
              .maybeSingle();
            if (exists?.id) {
              results.push({ external_id: extId, session_id: exists.id, ok: true });
              continue;
            }
          }

          const createdAt = s?.created_at && !Number.isNaN(Date.parse(s.created_at)) ? new Date(s.created_at).toISOString() : new Date().toISOString();
          const insertPayload: Record<string, any> = {
            user_id: uid,
            flashcard_set_id: null,
            quiz_id: null,
            grade_level: Number.isInteger(s?.grade_level) ? s.grade_level : null,
            title: typeof s?.title === 'string' ? String(s.title).slice(0, 120) : null,
            topics: typeof s?.topics === 'string' ? s.topics : null,
            topics_sources: s?.topics_sources ?? null,
            documents: Array.isArray(s?.documents) ? s.documents : null,
            created_at: createdAt,
            external_id: extId,
          };
          // Create session (allow explicit created_at)
          const { data: created, error: createErr } = await supabase
            .from('chat_sessions')
            .insert(insertPayload)
            .select('id')
            .single();
          if (createErr) throw createErr;
          const session_id = created.id as string;

          // Flashcards
          const fcItems = entry?.flashcards?.items;
          if (Array.isArray(fcItems) && fcItems.length > 0) {
            const { data: fci, error: fce } = await supabase
              .from('flashcard_sets')
              .insert({ user_id: uid, items: fcItems })
              .select('id')
              .single();
            if (!fce && fci?.id) {
              await supabase.from('chat_sessions').update({ flashcard_set_id: fci.id }).eq('id', session_id).eq('user_id', uid);
            }
          }

          // Quiz
          const qzItems = entry?.quiz?.items;
          if (Array.isArray(qzItems) && qzItems.length > 0) {
            const { data: qzi, error: qze } = await supabase
              .from('quizzes')
              .insert({ user_id: uid, items: qzItems, results: entry?.quiz?.results ?? null })
              .select('id')
              .single();
            if (!qze && qzi?.id) {
              await supabase.from('chat_sessions').update({ quiz_id: qzi.id }).eq('id', session_id).eq('user_id', uid);
            }
          }

          // Messages (preserve created_at)
          const msgs = Array.isArray(entry?.messages) ? entry.messages : [];
          if (msgs.length > 0) {
            const rows = msgs.map((m: any) => ({
              session_id,
              user_id: uid,
              role: m.role === 'model' ? 'assistant' : m.role,
              content: String(m.content ?? m.text ?? ''),
              created_at: (m.created_at && !Number.isNaN(Date.parse(m.created_at)) ? new Date(m.created_at).toISOString() : undefined)
            }));
            // Insert in order; if created_at omitted, default now
            for (const r of rows) {
              await supabase.from('chat_messages').insert(r);
            }
          }

          // Optional normalized documents (session_documents) if present
          const docs = Array.isArray(s?.documents) ? s.documents : [];
          if (docs.length > 0) {
            // Best-effort: insert doc metadata as text_content
            try {
              const rows = docs.map((d: any) => ({
                session_id,
                user_id: uid,
                name: String(d?.name ?? 'Document'),
                mime: d?.mime ?? null,
                size_bytes: d?.size_bytes ?? null,
                text_content: typeof d?.content === 'string' ? d.content : null,
                storage_path: d?.storage_path ?? null,
              }));
              if (rows.length) await supabase.from('session_documents').insert(rows);
            } catch {}
          }

          // After inserting messages, recompute last_message_at and message_count explicitly if triggers missing
          try {
            const { data: msgAgg } = await supabase
              .from('chat_messages')
              .select('created_at')
              .eq('session_id', session_id)
              .order('created_at', { ascending: false })
              .limit(1);
            const last = msgAgg && msgAgg[0]?.created_at ? msgAgg[0].created_at : createdAt;
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', session_id);
            await supabase
              .from('chat_sessions')
              .update({ last_message_at: last, message_count: count ?? 0 })
              .eq('id', session_id)
              .eq('user_id', uid);
          } catch {}

          results.push({ external_id: extId, session_id, ok: true });
        } catch (e) {
          results.push({ ok: false, error: (e as any)?.message || String(e) });
        }
      }
      const summary = {
        imported: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results,
      };
      return new Response(JSON.stringify(summary), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'get_session') {
      const id = body?.id as string | undefined;
      if (!id) return bad(400, 'id required');
      let session: any = null;
      // Try selecting with optional columns; fall back if columns don't exist
      let s = await supabase
        .from('chat_sessions')
        .select('id, created_at, flashcard_set_id, quiz_id, topics, topics_sources, documents, grade_level, title, last_message_at, message_count')
        .eq('id', id)
        .eq('user_id', uid)
        .single();
      if (s.error) {
        const s2 = await supabase
          .from('chat_sessions')
          .select('id, created_at, flashcard_set_id, quiz_id')
          .eq('id', id)
          .eq('user_id', uid)
          .single();
        session = s2.data ?? null;
        if (!session) return bad(404, 'Not found');
      } else {
        session = s.data;
        if (!session) return bad(404, 'Not found');
      }

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

    if (action === 'delete_session') {
      const id = body?.id as string | undefined;
      const purge_related = Boolean(body?.purge_related);
      if (!id) return bad(400, 'id required');

      // Verify ownership and fetch related ids
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('id, user_id, flashcard_set_id, quiz_id')
        .eq('id', id)
        .eq('user_id', uid)
        .single();
      if (!session) return bad(404, 'Not found');

      // Optionally purge related flashcards/quizzes if they belong to the user
      if (purge_related) {
        if (session.flashcard_set_id) {
          await supabase
            .from('flashcard_sets')
            .delete()
            .eq('id', session.flashcard_set_id)
            .eq('user_id', uid);
        }
        if (session.quiz_id) {
          await supabase
            .from('quizzes')
            .delete()
            .eq('id', session.quiz_id)
            .eq('user_id', uid);
        }
      }

      // Delete the session (will cascade delete messages)
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', uid);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return bad(400, 'Unknown action');
  } catch (e) {
    console.error('history error:', e);
    return bad(500, `Error: ${(e as Error)?.message || e}`);
  }
});
