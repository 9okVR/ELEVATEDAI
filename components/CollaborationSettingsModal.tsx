import React, { useState, useEffect } from 'react';

interface CollaborationModels {
  planner: string;
  synthesizer: string;
}

interface CollaborationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelection: CollaborationModels;
  onSave: (models: CollaborationModels) => void;
}

const CollaborationSettingsModal: React.FC<CollaborationSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentSelection, 
  onSave 
}) => {
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setShow(true), 100);
    } else {
      setShow(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        show ? 'backdrop-blur-lg bg-black/70' : 'backdrop-blur-none bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`relative w-full max-w-2xl bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl transition-all duration-300 ease-out ${
          show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Collaboration Settings</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-purple-200/80">
              Configure AI model collaboration for enhanced responses.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Planning Model</label>
                <div className="text-gray-300 text-sm">Current: {currentSelection.planner}</div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Synthesis Model</label>
                <div className="text-gray-300 text-sm">Current: {currentSelection.synthesizer}</div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationSettingsModal;
