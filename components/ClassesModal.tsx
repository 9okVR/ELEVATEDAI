import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClass, joinClass, listMyClasses, ClassRecord } from '../services/classService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ClassesModal: React.FC<ClassesModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'my'|'create'|'join'>('my');
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [taught, setTaught] = useState<ClassRecord[]>([]);
  const [joined, setJoined] = useState<ClassRecord[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isOpen);

  useEffect(() => { if (isOpen) refresh(); }, [isOpen]);

  async function refresh() {
    setLoading(true); setMsg(null);
    try { const lists = await listMyClasses(); setTaught(lists.taught); setJoined(lists.joined); } finally { setLoading(false); }
  }

  async function handleCreate() {
    setMsg(null); setLoading(true);
    try {
      const res = await createClass(name.trim());
      if (!res.ok) setMsg(res.error || 'Failed to create class');
      else { setMsg(`Created class ${res.cls!.name}. Join code: ${res.cls!.join_code}`); setName(''); await refresh(); setTab('my'); }
    } finally { setLoading(false); }
  }

  async function handleJoin() {
    setMsg(null); setLoading(true);
    try {
      const res = await joinClass(joinCode.trim());
      if (!res.ok) setMsg(res.error || 'Failed to join class');
      else { setMsg(`Joined ${res.cls!.name}`); setJoinCode(''); await refresh(); setTab('my'); }
    } finally { setLoading(false); }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur" onClick={onClose} />
      <div ref={containerRef} className="relative w-full max-w-3xl bg-gray-900/95 border border-white/15 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">Classes</h3>
          <div className="flex gap-2">
            <button className={`px-3 py-2 rounded ${tab==='my'?'bg-white/20':'bg-white/10'}`} onClick={()=>setTab('my')}>My Classes</button>
            <button className={`px-3 py-2 rounded ${tab==='create'?'bg-white/20':'bg-white/10'}`} onClick={()=>setTab('create')}>Create</button>
            <button className={`px-3 py-2 rounded ${tab==='join'?'bg-white/20':'bg-white/10'}`} onClick={()=>setTab('join')}>Join</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {tab==='my' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-white font-semibold mb-2">Classes I Teach</h4>
                <div className="space-y-2">
                  {taught.length===0 && <p className="text-white/60">None yet</p>}
                  {taught.map(c=> (
                    <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{c.name}</p>
                        <p className="text-xs text-white/60">Join code: {c.join_code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Classes I Joined</h4>
                <div className="space-y-2">
                  {joined.length===0 && <p className="text-white/60">None yet</p>}
                  {joined.map(c=> (
                    <div key={c.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-white font-medium">{c.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab==='create' && (
            <div className="space-y-4">
              <label className="block text-white/80">Class name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g., Algebra 1" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white" />
              <button onClick={handleCreate} disabled={loading || !name.trim()} className="px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold disabled:opacity-50">{loading? 'Creating...' : 'Create Class'}</button>
            </div>
          )}

          {tab==='join' && (
            <div className="space-y-4">
              <label className="block text-white/80">Join code</label>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="e.g., ABCD12" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white uppercase tracking-widest" />
              <button onClick={handleJoin} disabled={loading || !joinCode.trim()} className="px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold disabled:opacity-50">{loading? 'Joining...' : 'Join Class'}</button>
            </div>
          )}

          {msg && <p className="text-sm text-purple-300">{msg}</p>}
        </div>
        <div className="p-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ClassesModal;

