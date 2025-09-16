import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Announcement, listAnnouncements, addAnnouncement, listComments, addComment, listResources, addResource, Resource } from '../services/classRoomService';

interface ClassRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }>=({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-3 py-2 rounded-xl border ${active ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}>{label}</button>
);

const Glow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative rounded-2xl border border-white/10 bg-white/[0.02]">
    <div className="absolute -inset-px rounded-2xl bg-gradient-to-tr from-purple-600/10 via-indigo-600/10 to-transparent"/>
    <div className="relative p-4 sm:p-5">{children}</div>
  </div>
);

const ClassRoomModal: React.FC<ClassRoomModalProps> = ({ isOpen, onClose, classId, className }) => {
  const [tab, setTab] = useState<'stream'|'resources'>('stream');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [newPost, setNewPost] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useBodyScrollLock(isOpen);

  useEffect(() => { if (isOpen) bootstrap(); }, [isOpen, classId]);

  async function bootstrap() {
    setLoading(true); setMsg(null);
    try {
      const [a, r] = await Promise.all([listAnnouncements(classId), listResources(classId)]);
      setAnnouncements(a); setResources(r);
    } finally { setLoading(false); }
  }

  async function handlePost() {
    if (!newPost.trim()) return;
    const res = await addAnnouncement(classId, newPost.trim());
    if (!res.ok) { setMsg(res.error || 'Failed to post'); return; }
    setNewPost(''); await bootstrap();
  }

  async function handleAddResource() {
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
    const res = await addResource(classId, newResourceTitle.trim(), newResourceUrl.trim());
    if (!res.ok) { setMsg(res.error || 'Failed to add resource'); return; }
    setNewResourceTitle(''); setNewResourceUrl(''); await bootstrap();
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/15 bg-gray-900/95 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-700/15 to-purple-700/15">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">🏫</div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{className}</h3>
              <p className="text-xs text-white/60">Class Hub</p>
            </div>
          </div>
          <div className="flex gap-2">
            <TabButton active={tab==='stream'} onClick={()=>setTab('stream')} label="Stream" />
            <TabButton active={tab==='resources'} onClick={()=>setTab('resources')} label="Resources" />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {tab==='stream' && (
            <div className="space-y-5">
              <Glow>
                <textarea value={newPost} onChange={e=>setNewPost(e.target.value)} placeholder="Share an announcement…" className="w-full min-h-[80px] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
                <div className="mt-3 flex justify-end">
                  <button onClick={handlePost} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold">Post</button>
                </div>
              </Glow>
              <div className="space-y-3">
                {loading && <Glow><div className="animate-pulse h-14 bg-white/10 rounded"/></Glow>}
                {!loading && announcements.length===0 && (
                  <Glow><p className="text-white/70">No announcements yet.</p></Glow>
                )}
                {!loading && announcements.map(a => (
                  <Glow key={a.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">📣</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-semibold truncate">Announcement</p>
                          <span className="text-xs text-white/50">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-white/90 whitespace-pre-wrap mt-1">{a.body}</p>
                        <Comments announcementId={a.id} />
                      </div>
                    </div>
                  </Glow>
                ))}
              </div>
            </div>
          )}

          {tab==='resources' && (
            <div className="space-y-5">
              <Glow>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={newResourceTitle} onChange={e=>setNewResourceTitle(e.target.value)} placeholder="Resource title" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  <input value={newResourceUrl} onChange={e=>setNewResourceUrl(e.target.value)} placeholder="https://…" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 col-span-1 sm:col-span-2" />
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={handleAddResource} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">Add</button>
                </div>
              </Glow>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading && <Glow><div className="animate-pulse h-20 bg-white/10 rounded"/></Glow>}
                {!loading && resources.length===0 && <Glow><p className="text-white/70">No resources yet.</p></Glow>}
                {!loading && resources.map(r => (
                  <Glow key={r.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">🔗</div>
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{r.title}</p>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-300 text-sm break-all hover:underline">{r.url}</a>
                        <p className="text-xs text-white/50 mt-1">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </Glow>
                ))}
              </div>
            </div>
          )}

          {msg && <div className="px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-200 text-sm">{msg}</div>}
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex justify-end bg-black/20">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15">Close</button>
        </div>
      </div>
    </div>
  );
};

const Comments: React.FC<{ announcementId: number }> = ({ announcementId }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => { if (open) refresh(); }, [open]);
  async function refresh() { const data = await listComments(announcementId); setItems(data); }
  async function submit() { if (!text.trim()) return; const res = await addComment(announcementId, text.trim()); if (res.ok) { setText(''); await refresh(); } }

  return (
    <div className="mt-3">
      <button onClick={()=>setOpen(v=>!v)} className="text-sm text-white/70 hover:text-white">{open? 'Hide comments' : 'View comments'}</button>
      {open && (
        <div className="mt-2 space-y-2">
          {items.length===0 && <p className="text-white/60 text-sm">No comments yet.</p>}
          {items.map(c => (
            <div key={c.id} className="text-sm text-white/90 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <div className="flex justify-between"><span>💬 Comment</span><span className="text-white/50 text-xs">{new Date(c.created_at).toLocaleString()}</span></div>
              <div className="mt-1 whitespace-pre-wrap">{c.body}</div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a comment…" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
            <button onClick={submit} className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/15">Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassRoomModal;
