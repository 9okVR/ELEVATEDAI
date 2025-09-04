import { hasSupabaseConfig, getAccessToken } from './supabaseClient';

const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;

function canUse(): boolean {
  return Boolean(baseUrl) && hasSupabaseConfig();
}

async function call(action: string, payload: any = {}): Promise<{ ok: boolean; data?: any; error?: string }>{
  if (!canUse()) return { ok: false, error: 'Supabase not configured' };
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  const resp = await fetch(`${baseUrl}/functions/v1/history`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...payload })
  });
  const text = await resp.text().catch(() => '');
  if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}${text ? `: ${text}` : ''}` };
  try {
    return { ok: true, data: text ? JSON.parse(text) : null };
  } catch {
    return { ok: true, data: null };
  }
}

export async function saveFlashcardSet(items: any[]): Promise<{ ok: boolean; id?: string; error?: string }>{
  const res = await call('save_flashcards', { items });
  return res.ok ? { ok: true, id: res.data?.id } : { ok: false, error: res.error };
}

export async function saveQuiz(items: any[], results?: any): Promise<{ ok: boolean; id?: string; error?: string }>{
  const res = await call('save_quiz', { items, results });
  return res.ok ? { ok: true, id: res.data?.id } : { ok: false, error: res.error };
}

export async function createChatSession(payload: { flashcard_set_id?: string | null; quiz_id?: string | null }): Promise<{ ok: boolean; id?: string; error?: string }>{
  const res = await call('create_session', payload);
  return res.ok ? { ok: true, id: res.data?.id } : { ok: false, error: res.error };
}

export async function updateChatSession(payload: { id: string; flashcard_set_id?: string; quiz_id?: string; topics?: string; topics_sources?: any }): Promise<{ ok: boolean; error?: string }>{
  const res = await call('update_session', payload);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function addChatMessage(session_id: string, role: 'user' | 'assistant' | 'system', content: string): Promise<{ ok: boolean; error?: string }>{
  const res = await call('add_message', { session_id, role, content });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function listChatSessions(limit = 20): Promise<{ ok: boolean; sessions?: any[]; error?: string }>{
  const res = await call('list_sessions', { limit });
  return res.ok ? { ok: true, sessions: res.data?.sessions ?? [] } : { ok: false, error: res.error };
}

export async function getChatSession(id: string): Promise<{ ok: boolean; data?: any; error?: string }>{
  const res = await call('get_session', { id });
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
}

export async function deleteChatSession(id: string, purge_related = true): Promise<{ ok: boolean; error?: string }>{
  const res = await call('delete_session', { id, purge_related });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
