import React, { useEffect, useRef, useState } from 'react';
import { createClass, joinClass, listMyClasses, ClassRecord } from '../services/classService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }>=({ active, onClick, label, icon }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${active ? 'bg-white/15 border-white/30 text-white shadow-inner' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
    aria-pressed={active}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const GlowCard: React.FC<{ children: React.ReactNode; className?: string }>=({ children, className }) => (
  <div className={`relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${className||''}`}>
    <div className="absolute -inset-px rounded-2xl bg-gradient-to-tr from-purple-600/10 via-indigo-600/10 to-transparent pointer-events-none"/>
    <div className="relative p-4 sm:p-5">{children}</div>
  </div>
);

const SkeletonCard: React.FC = () => (
  <GlowCard>
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-white/10 rounded w-2/5"/>
      <div className="h-3 bg-white/10 rounded w-1/4"/>
    </div>
  </GlowCard>
);

const ClassesModal: React.FC<ClassesModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'my'|'create'|'join'>('my');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [taught, setTaught] = useState<ClassRecord[]>([]);
  const [joined, setJoined] = useState<ClassRecord[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen);

  useEffect(() => { if (isOpen) refresh(); }, [isOpen]);

  async function refresh() {
    setLoading(true); setMsg(null);
    try { const lists = await listMyClasses(); setTaught(lists.taught); setJoined(lists.joined); } finally { setLoading(false); }
  }

  async function handleCreate() {
    setMsg(null); setBusy(true);
    try {
      const res = await createClass(name.trim());
      if (!res.ok) setMsg(res.error || 'Failed to create class');
      else { setMsg(`Created “${res.cls!.name}”. Join code copied to clipboard.`); try { await navigator.clipboard.writeText(res.cls!.join_code); } catch {} setName(''); await refresh(); setTab('my'); }
    } finally { setBusy(false); }
  }

  async function handleJoin() {
    setMsg(null); setBusy(true);
    try {
      const res = await joinClass(joinCode.trim());
      if (!res.ok) setMsg(res.error || 'Failed to join class');
      else { setMsg(`Joined “${res.cls!.name}”.`); setJoinCode(''); await refresh(); setTab('my'); }
    } finally { setBusy(false); }
  }

  function copy(code: string) {
    try { navigator.clipboard.writeText(code); setMsg('Join code copied'); } catch {}
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div ref={containerRef} className="relative w-full max-w-4xl rounded-2xl border border-white/15 bg-gray-900/95 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-700/20 via-indigo-700/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">🏫</div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Classes</h3>
              <p className="text-xs text-white/60">Create, share, and manage your classes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <TabButton active={tab==='my'} onClick={()=>setTab('my')} label="My Classes" icon={<span className="text-white/70">📚</span>} />
            <TabButton active={tab==='create'} onClick={()=>setTab('create')} label="Create" icon={<span className="text-white/70">➕</span>} />
            <TabButton active={tab==='join'} onClick={()=>setTab('join')} label="Join" icon={<span className="text-white/70">🔑</span>} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {tab==='my' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">Classes I Teach <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-200 border border-purple-500/30">{taught.length}</span></h4>
                  <div className="space-y-3">
                    {loading && <><SkeletonCard/><SkeletonCard/></>}
                    {!loading && taught.length===0 && (
                      <GlowCard>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">📘</div>
                          <div>
                            <p className="text-white/80 font-medium">No classes yet</p>
                            <p className="text-white/50 text-sm">Create your first class to get a join code.</p>
                          </div>
                        </div>
                      </GlowCard>
                    )}
                    {!loading && taught.map(c => (
                      <GlowCard key={c.id}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{c.name}</p>
                            <p className="text-xs text-white/60">Join code: <span className="font-mono tracking-widest">{c.join_code}</span></p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={()=>copy(c.join_code)} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 border border-white/15">Copy</button>
                            <button onClick={async()=>{ if (!confirm('Delete this class? This cannot be undone.')) return; setBusy(true); try{ const res = await (await import('../services/classService')).deleteClass(c.id); setMsg(res.ok? 'Class deleted.' : res.error || 'Delete failed'); await refresh(); } finally { setBusy(false);} }} className="px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white border border-red-400/30">Delete</button>
                          </div>
                        </div>
                      </GlowCard>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">Classes I Joined <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-500/30">{joined.length}</span></h4>
                  <div className="space-y-3">
                    {loading && <><SkeletonCard/><SkeletonCard/></>}
                    {!loading && joined.length===0 && (
                      <GlowCard>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">📗</div>
                          <div>
                            <p className="text-white/80 font-medium">You haven’t joined a class</p>
                            <p className="text-white/50 text-sm">Ask your teacher for a join code and paste it in Join.</p>
                          </div>
                        </div>
                      </GlowCard>
                    )}
                    {!loading && joined.map(c => (
                      <GlowCard key={c.id}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{c.name}</p>
                            <p className="text-xs text-white/60">Enrolled</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={async()=>{ if (!confirm('Leave this class?')) return; setBusy(true); try{ const res = await (await import('../services/classService')).leaveClass(c.id); setMsg(res.ok? 'You left the class.' : res.error || 'Leave failed'); await refresh(); } finally { setBusy(false);} }} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15">Leave</button>
                          </div>
                        </div>
                      </GlowCard>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab==='create' && (
            <div className="max-w-lg mx-auto space-y-5">
              <GlowCard>
                <label className="block text-white/80 mb-2">Class name</label>
                <div className="flex items-center gap-2">
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Algebra 1" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
                  <button onClick={handleCreate} disabled={busy || !name.trim()} className={`px-4 py-3 rounded-xl font-semibold text-white ${busy || !name.trim() ? 'bg-gray-700/50 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90'}`}>{busy? 'Creating...' : 'Create'}</button>
                </div>
                <p className="text-xs text-white/50 mt-2">We’ll generate a unique join code automatically.</p>
              </GlowCard>
            </div>
          )}

          {tab==='join' && (
            <div className="max-w-lg mx-auto space-y-5">
              <GlowCard>
                <label className="block text-white/80 mb-2">Join code</label>
                <div className="flex items-center gap-2">
                  <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABCD12" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  <button onClick={handleJoin} disabled={busy || !joinCode.trim()} className={`px-4 py-3 rounded-xl font-semibold text-white ${busy || !joinCode.trim() ? 'bg-gray-700/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90'}`}>{busy? 'Joining...' : 'Join'}</button>
                </div>
                <p className="text-xs text-white/50 mt-2">Ask your teacher for the 6‑character code.</p>
              </GlowCard>
            </div>
          )}

          {msg && (
            <div className="mt-5">
              <div className="px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-200 text-sm">{msg}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex justify-end bg-black/20">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ClassesModal;
