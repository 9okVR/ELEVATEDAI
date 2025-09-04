import React, { useEffect, useState } from 'react';
import { listChatSessions } from '../services/historyService';

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
      } else {
        setSessions(res.sessions || []);
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
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Chat History</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="text-gray-400">Loading sessions…</div>
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
                  <div className="text-sm">
                    <div className="text-white font-medium">Session {s.id.slice(0, 8)}</div>
                    <div className="text-gray-400">{new Date(s.created_at).toLocaleString()}</div>
                    <div className="text-gray-500 text-xs">
                      {s.flashcard_set_id ? 'Flashcards' : ''}{s.flashcard_set_id && s.quiz_id ? ' · ' : ''}{s.quiz_id ? 'Quiz' : ''}
                    </div>
                  </div>
                  <button onClick={() => { onSelectSession(s.id); onClose(); }} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold">
                    Open
                  </button>
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

