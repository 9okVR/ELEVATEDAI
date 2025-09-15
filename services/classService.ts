import { supabase, getAccessToken } from './supabaseClient';

const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;

export type ClassRecord = { id: string; name: string; join_code: string };

export async function createClass(name: string): Promise<{ ok: boolean; cls?: ClassRecord; error?: string }>{
  if (!baseUrl) return { ok: false, error: 'Supabase not configured' };
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  const resp = await fetch(`${baseUrl}/functions/v1/create-class`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!resp.ok) {
    let text = '';
    try { text = await resp.text(); } catch {}
    return { ok: false, error: text || `HTTP ${resp.status}` };
  }
  const data = await resp.json().catch(() => null);
  if (!data?.ok) return { ok: false, error: 'Malformed response' };
  return { ok: true, cls: data.class };
}

export async function joinClass(join_code: string): Promise<{ ok: boolean; cls?: ClassRecord; error?: string }>{
  if (!baseUrl) return { ok: false, error: 'Supabase not configured' };
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  const resp = await fetch(`${baseUrl}/functions/v1/join-class`, {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ join_code })
  });
  if (!resp.ok) {
    let text = '';
    try { text = await resp.text(); } catch {}
    return { ok: false, error: text || `HTTP ${resp.status}` };
  }
  const data = await resp.json().catch(() => null);
  if (!data?.ok) return { ok: false, error: 'Malformed response' };
  return { ok: true, cls: data.class };
}

export async function listMyClasses(): Promise<{ taught: ClassRecord[]; joined: ClassRecord[] }>{
  const taught: ClassRecord[] = [];
  const joined: ClassRecord[] = [];
  if (!supabase) return { taught, joined };
  // Current user id
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { taught, joined };

  const a = await supabase.from('classes').select('id, name, join_code').eq('teacher_id', uid);
  if (a.data) taught.push(...a.data as any);

  const m = await supabase.from('class_members').select('class_id').eq('user_id', uid);
  const classIds = (m.data || []).map((r: any) => r.class_id);
  if (classIds.length > 0) {
    const b = await supabase.from('classes').select('id, name, join_code').in('id', classIds);
    if (b.data) joined.push(...b.data as any);
  }
  return { taught, joined };
}
