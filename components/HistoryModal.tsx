import React, { useEffect, useMemo, useState } from 'react';
import { listChatSessions, deleteChatSession } from '../services/historyService';

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
  const [sessions, setSessions] = useState<Array<{ id: string; created_at: string; flashcard_set_id: string | null; quiz_id: string | null }>>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-50 ${show ? '' : 'pointer-events-none'}`} aria-modal="true" role="dialog">
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`absolute inset-0 flex items-center justify-center p-4`}>
        <div className={`w-full max-w-lg bg-gray-900/95 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl transition-all duration-200 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Chat History</h2>
              {sessions.length > 0 && (
                <label className="ea-checkbox text-sm text-gray-300 select-none" title={allSelected ? 'Unselect All' : 'Select All'}>
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
            <div className="flex items-center gap-2">
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
                className={`px-3 py-1.5 rounded-lg text-white text-sm font-semibold ${hasSelection && !bulkDeleting ? 'bg-red-600 hover:bg-red-700' : 'bg-red-800/60 cursor-not-allowed'}`}
                aria-disabled={!hasSelection || bulkDeleting}
              >
                {bulkDeleting ? 'Deleting...' : hasSelection ? `Delete Selected (${selectedIds.size})` : 'Delete Selected'}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="text-gray-400">Loading sessions...</div>
            )}
            {error && (
              <div className="text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">{error}</div>
            )}
            {!loading && !error && sessions.length === 0 && (
              <div className="text-gray-400">No sessions found.</div>
            )}
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
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
                    <div className="text-sm">
                      <div className="text-white font-medium">Session {s.id.slice(0, 8)}</div>
                      <div className="text-gray-400">{new Date(s.created_at).toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">
                        {s.flashcard_set_id ? 'Flashcards' : ''}{s.flashcard_set_id && s.quiz_id ? ' | ' : ''}{s.quiz_id ? 'Quiz' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { onSelectSession(s.id); onClose(); }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold"
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
                      className={`px-3 py-1.5 rounded-lg text-white text-sm font-semibold ${deletingId === s.id ? 'bg-red-800/60 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {deletingId === s.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
