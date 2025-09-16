import { supabase } from './supabaseClient';

export type Announcement = { id: number; class_id: string; user_id: string; body: string; created_at: string };
export type Comment = { id: number; announcement_id: number; user_id: string; body: string; created_at: string };
export type Resource = { id: number; class_id: string; user_id: string; title: string; url: string; created_at: string };

export async function listAnnouncements(classId: string): Promise<Announcement[]> {
  if (!supabase) return [] as Announcement[];
  const { data } = await supabase.from('announcements').select('*').eq('class_id', classId).order('created_at', { ascending: false });
  return (data || []) as any;
}

export async function addAnnouncement(classId: string, body: string): Promise<{ ok: boolean; error?: string }>{
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase.from('announcements').insert({ class_id: classId, body });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listComments(announcementId: number): Promise<Comment[]> {
  if (!supabase) return [] as Comment[];
  const { data } = await supabase.from('comments').select('*').eq('announcement_id', announcementId).order('created_at', { ascending: true });
  return (data || []) as any;
}

export async function addComment(announcementId: number, body: string): Promise<{ ok: boolean; error?: string }>{
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase.from('comments').insert({ announcement_id: announcementId, body });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listResources(classId: string): Promise<Resource[]> {
  if (!supabase) return [] as Resource[];
  const { data } = await supabase.from('resources').select('*').eq('class_id', classId).order('created_at', { ascending: false });
  return (data || []) as any;
}

export async function addResource(classId: string, title: string, url: string): Promise<{ ok: boolean; error?: string }>{
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase.from('resources').insert({ class_id: classId, title, url });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

