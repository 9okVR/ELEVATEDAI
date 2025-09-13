import React, { useEffect, useMemo, useState } from 'react';
import { listChatSessions, deleteChatSession, updateChatSession, getChatSession } from '../services/historyService';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (id: string) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelectSession }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{
    id: string;
    created_at: string;
    flashcard_set_id: string | null;
    quiz_id: string | null;
    title?: string | null;
    last_message_at?: string | null;
    message_count?: number | null;
    grade_level?: number | null;
  }>>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [viewDensity, setViewDensity] = useState<'cozy' | 'compact'>('cozy');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, { lastMessage?: string; docCount?: number }>>({});

  const allSelected = useMemo(() => sessions.length > 0 && selectedIds.size === sessions.length, [sessions, selectedIds]);
  const hasSelection = selectedIds.size > 0;

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const t = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(t);
    } else {
      setShow(false);
      const t = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    (async () => {
      const res = await listChatSessions(20);
      if (!res.ok) {
        setError(res.error || 'Failed to load sessions');
        setSessions([]);
        setSelectedIds(new Set());
      } else {
        const list = res.sessions || [];
        setSessions(list);
        setSelectedIds(prev => new Set(Array.from(prev).filter(id => list.some(s => s.id === id))));
      }
      setLoading(false);
    })();
  }, [isOpen]);

  // Fetch lightweight previews (last message + doc count) after sessions load
  useEffect(() => {
    if (!isOpen || sessions.length === 0) return;
    (async () => {
      try {
        const idsToFetch = sessions.map(s => s.id);
        const results = await Promise.all(idsToFetch.map(async (id) => {
          try {
            const res = await getChatSession(id);
            if (!res.ok || !res.data) return [id, {}] as const;
            const { messages, session } = res.data as any;
            const last = Array.isArray(messages) && messages.length > 0 ? String(messages[messages.length - 1].content || '') : '';
            const docCount = Array.isArray(session?.documents) ? session.documents.length : undefined;
            return [id, { lastMessage: last, docCount }] as const;
          } catch { return [id, {}] as const; }
        }));
        const map: Record<string, { lastMessage?: string; docCount?: number }> = {};
        for (const [id, data] of results) map[id] = data;
        setPreviews(map);
      } catch {}
    })();
  }, [isOpen, sessions]);

  const startEditing = (id: string, currentTitle: string | undefined | null) => {
    setEditingId(id);
    setEditingTitle(String(currentTitle ?? '').slice(0, 120));
  };

  const commitTitle = async (id: string) => {
    const title = editingTitle.trim().slice(0, 120);
    setEditingId(null);
    if (!title) return; // allow clearing by doing nothing; keep old title
    try {
      setRenamingId(id);
      const res = await updateChatSession({ id, title });
      setRenamingId(null);
      if (!res.ok) { setError(res.error || 'Failed to rename'); return; }
      setSessions(curr => curr.map(s => s.id === id ? { ...s, title } : s));
    } catch (e) {
      setRenamingId(null);
      setError('Failed to rename');
    }
  };

  const formatRelativeTime = (iso: string | null | undefined): string => {
    try {
      const date = iso ? new Date(iso) : null;
      const base = date && !isNaN(date.getTime()) ? date : new Date();
      const diffMs = Date.now() - base.getTime();
      const absSec = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
      const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
      if (absSec < 60) return rtf.format(-Math.round(diffMs / 1000), 'second');
      const minutes = Math.round(diffMs / (60 * 1000));
      if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
      const hours = Math.round(diffMs / (60 * 60 * 1000));
      if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
      const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
      return rtf.format(-days, 'day');
    } catch {
      return '';
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-50 ${show ? '' : 'pointer-events-none'}`} aria-modal="true" role="dialog">
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`absolute inset-0 flex items-center justify-center p-4`}>
        <div className={`w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-white">Chat History</h2>
              {sessions.length > 0 && (
                <label className="ea-checkbox text-xs text-gray-300 select-none" title={allSelected ? 'Unselect All' : 'Select All'}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(sessions.map(s => s.id)));
                      else setSelectedIds(new Set());
                    }}
                    aria-label={allSelected ? 'Unselect All sessions' : 'Select All sessions'}
                  />
                  <span className="ea-check" aria-hidden="true">
                    <svg className="ea-check-icon" viewBox="0 0 24 24" fill="none" strokeWidth="3">
                      <path d="M5 12l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="ml-2">{allSelected ? 'Unselect All' : 'Select All'}</span>
                </label>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={async () => {
                  if (!hasSelection || bulkDeleting) return;
                  const count = selectedIds.size;
                  const yes = confirm(`Delete ${count} selected session${count === 1 ? '' : 's'} and related flashcards/quiz? This cannot be undone.`);
                  if (!yes) return;
                  setBulkDeleting(true);
                  setError(null);
                  const ids = Array.from(selectedIds);
                  const failures: string[] = [];
                  for (const id of ids) {
                    try {
                      const res = await deleteChatSession(id, true);
                      if (!res.ok) failures.push(id);
                    } catch {
                      failures.push(id);
                    }
                  }
                  setBulkDeleting(false);
                  if (failures.length > 0) {
                    setError(`Failed to delete ${failures.length} item(s). Please try again.`);
                  }
                  setSessions(curr => curr.filter(s => !selectedIds.has(s.id)));
                  setSelectedIds(new Set());
                }}
                disabled={!hasSelection || bulkDeleting}
                className={`px-2.5 py-1 rounded-md text-white text-xs font-semibold ${hasSelection && !bulkDeleting ? 'bg-red-600 hover:bg-red-700' : 'bg-red-800/60 cursor-not-allowed'}`}
                aria-disabled={!hasSelection || bulkDeleting}
              >
                {bulkDeleting ? 'Deleting...' : hasSelection ? `Delete Selected (${selectedIds.size})` : 'Delete Selected'}
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!hasSelection) return;
                    const ids = Array.from(selectedIds);
                    const payload: any[] = [];
                    for (const id of ids) {
                      try {
                        const res = await getChatSession(id);
                        if (res.ok && res.data) payload.push(res.data);
                      } catch {}
                    }
                    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), sessions: payload }, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                    a.href = url;
                    a.download = `elevated-ai-sessions-${stamp}.json`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
                  } catch (e) {
                    setError('Failed to export selection');
                  }
                }}
                disabled={!hasSelection}
                className={`px-2.5 py-1 rounded-md text-white text-xs font-semibold ${hasSelection ? 'bg-white/10 hover:bg-white/20 border border-white/20' : 'bg-white/5 border border-white/10 cursor-not-allowed text-white/50'}`}
              >
                Export Selected
              </button>
              <div className="ml-2">
                <label className="flex items-center gap-1.5 text-xs text-white/70 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5" checked={viewDensity === 'compact'} onChange={(e) => setViewDensity(e.target.checked ? 'compact' : 'cozy')} />
                  Compact
                </label>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div className="p-3 max-h-[60vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
            {loading && (
              <ul className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="p-3 rounded-xl border border-white/10 bg-white/5">
                    <div className="h-4 w-40 skeleton mb-2"></div>
                    <div className="h-3 w-24 skeleton mb-1"></div>
                    <div className="h-3 w-32 skeleton"></div>
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <div className="text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>
            )}
            {!loading && !error && sessions.length === 0 && (
              <div className="text-gray-400">No sessions found.</div>
            )}
            {/* Grouping into Today / Yesterday / This week / Earlier */}
            {!loading && sessions.length > 0 && (
            <ul className="space-y-4">
              {(() => {
                const groups: Record<string, typeof sessions> = { 'Today': [], 'Yesterday': [], 'This week': [], 'Earlier': [] };
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfDay.getTime() - 24*60*60*1000);
                const startOfWeek = new Date(startOfDay.getTime() - (startOfDay.getDay() || 7 - 1) * 24*60*60*1000); // Monday-based
                for (const s of sessions) {
                  const ts = new Date(s.last_message_at || s.created_at);
                  if (ts >= startOfDay) groups['Today'].push(s);
                  else if (ts >= startOfYesterday) groups['Yesterday'].push(s);
                  else if (ts >= startOfWeek) groups['This week'].push(s);
                  else groups['Earlier'].push(s);
                }
                const order = ['Today', 'Yesterday', 'This week', 'Earlier'];
                return order.filter(label => groups[label].length > 0).map(label => (
                  <li key={label}>
                    <div className="text-xs uppercase tracking-wide text-white/60 mb-1">{label}</div>
                    <ul className="space-y-2">
                      {groups[label].map((s) => {
                const displayTitle = (s.title && String(s.title).trim()) ? String(s.title) : `Session ${s.id.slice(0, 8)}`;
                const recentTs = s.last_message_at || s.created_at;
                const rel = formatRelativeTime(recentTs);
                const msgCount = typeof s.message_count === 'number' ? s.message_count : undefined;
                const hasFlash = Boolean(s.flashcard_set_id);
                const hasQuiz = Boolean(s.quiz_id);
                const pv = previews[s.id] || {};
                const dense = viewDensity === 'compact';
                return (
                <li key={s.id} className={`flex items-start justify-between bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10 ${dense ? 'p-2' : 'p-3'} gap-3`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <label className="ea-checkbox" aria-label={`Select session ${s.id.slice(0,8)}`} title={`Select session ${s.id.slice(0,8)}`}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={(e) => {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(s.id); else next.delete(s.id);
                            return next;
                          });
                        }}
                      />
                      <span className="ea-check" aria-hidden="true">
                        <svg className="ea-check-icon" viewBox="0 0 24 24" fill="none" strokeWidth="3">
                          <path d="M5 12l4 4L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </label>
                    <div className={`text-sm ${dense ? 'leading-tight' : ''} min-w-0`}>
                      <div className="text-white font-semibold flex items-center gap-2">
                        {editingId === s.id ? (
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => commitTitle(s.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitTitle(s.id); if (e.key === 'Escape') setEditingId(null); }}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white w-56"
                            maxLength={120}
                          />
                        ) : (
                          <button className="truncate max-w-full text-left hover:underline" title="Rename session" onClick={() => startEditing(s.id, s.title)}>
                            {displayTitle}
                          </button>
                        )}
                        {renamingId === s.id && <span className="text-white/60 text-xs">Saving…</span>}
                        {typeof msgCount === 'number' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/10 border border-white/10 text-white/80" title={`${msgCount} messages`}>
                            {msgCount} msgs
                          </span>
                        )}
                        {typeof s.grade_level === 'number' && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200" title={`Grade ${s.grade_level}`}>
                            G{s.grade_level}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 flex items-center gap-2 min-w-0">
                        <span className="shrink-0" title={new Date(recentTs || s.created_at).toLocaleString()}>{rel || new Date(s.created_at).toLocaleString()}</span>
                        <div className="flex items-center gap-1 text-xs shrink-0">
                          {hasFlash && <span className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">Flashcards</span>}
                          {hasQuiz && <span className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70">Quiz</span>}
                        </div>
                        {(pv.lastMessage || pv.docCount != null) && (
                          <div className="text-xs text-white/60 truncate min-w-0">
                            {pv.docCount != null && <span className="mr-2">Docs: {pv.docCount}</span>}
                            {pv.lastMessage && <span className="italic">“{pv.lastMessage.slice(0, 100)}{pv.lastMessage.length > 100 ? '…' : ''}”</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { onSelectSession(s.id); onClose(); }}
                      className="px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                      disabled={deletingId === s.id}
                    >
                      Open
                    </button>
                    <button
                      onClick={async () => {
                        if (deletingId) return;
                        const yes = confirm('Delete this session and related flashcards/quiz? This cannot be undone.');
                        if (!yes) return;
                        setDeletingId(s.id);
                        const res = await deleteChatSession(s.id, true);
                        setDeletingId(null);
                        if (!res.ok) {
                          setError(res.error || 'Failed to delete');
                        } else {
                          setSessions(curr => curr.filter(x => x.id !== s.id));
                          setSelectedIds(prev => { const next = new Set(prev); next.delete(s.id); return next; });
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-white text-xs font-semibold ${deletingId === s.id ? 'bg-red-800/60 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {deletingId === s.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              );
                      })}
                    </ul>
                  </li>
                ));
              })()}
            </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
