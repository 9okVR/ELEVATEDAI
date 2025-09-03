import { hasSupabaseConfig, getAccessToken } from './supabaseClient';

const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;

export function canUseProxy(): boolean {
  return Boolean(baseUrl) && hasSupabaseConfig();
}

export async function saveUserApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }>{
  if (!canUseProxy()) return { ok: false, error: 'Supabase not configured' };
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  const resp = await fetch(`${baseUrl}/functions/v1/save-key`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ apiKey })
  });
  if (!resp.ok) {
    let body = '';
    try { body = await resp.text(); } catch {}
    let msg = `HTTP ${resp.status}`;
    if (resp.status === 404) msg += ' (function not deployed or wrong URL)';
    else if (resp.status === 401) msg += ' (not authenticated)';
    else if (resp.status === 400) msg += body ? `: ${body}` : ' (bad request)';
    else if (resp.status === 500) msg += body ? `: ${body}` : ' (server error)';
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function proxyGenerate(opts: {
  prompt: string;
  model: string;
  expectJson?: boolean;
  action: 'topics' | 'flashcards' | 'quiz' | 'chat';
  items?: number;
  docBytes?: number;
}): Promise<{ ok: boolean; text?: string; error?: string }>{
  if (!canUseProxy()) return { ok: false, error: 'Supabase not configured' };
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'Not authenticated' };
  const resp = await fetch(`${baseUrl}/functions/v1/ai-generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opts)
  });
  if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
  const data = await resp.json().catch(() => null);
  if (!data || typeof data.text !== 'string') return { ok: false, error: 'Malformed response' };
  return { ok: true, text: data.text };
}
