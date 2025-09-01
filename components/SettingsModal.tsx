import React from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'appearance' | 'layout' | 'advanced' | 'account';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 id="settings-title" className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20" aria-label="Close settings">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-4 text-white/80 text-sm">
          <p>Enhanced settings will return soon. Core features are unaffected.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

