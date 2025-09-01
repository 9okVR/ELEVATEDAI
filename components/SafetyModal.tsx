import React, { useEffect, useState } from 'react';
import ShieldWarningIcon from './icons/ShieldWarningIcon';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string | null;
}

const SafetyModal: React.FC<SafetyModalProps> = ({ isOpen, onClose, reason }) => {
  const [show, setShow] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      // Delay unmounting to allow fade-out animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll while modal is open (mobile stability)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const formatReason = (rawReason: string | null): string => {
    if (!rawReason) return 'An unspecified safety policy was violated.';
    
    // Make the reason more user-friendly
    return rawReason
      .replace(/Your document or prompt was blocked for the following reason: \w+/, 'This content has been restricted due to our safety policy.')
      .replace('The content has been restricted due to our safety policy regarding:', 'This content has been restricted due to our safety policy regarding')
      .replace('HARM_CATEGORY_', '')
      .replace(/_/g, ' ')
      .toLowerCase();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 pt-safe pb-safe overscroll-contain transition-opacity duration-300 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-md transition-all duration-300 ease-out ${
        show ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose}></div>

      <div
        className={`relative bg-gray-900/80 backdrop-blur-2xl border border-red-500/20 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out ${
          show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-500/20 rounded-full border-2 border-red-500/50">
            <ShieldWarningIcon className="w-8 h-8 text-red-400" />
          </div>
          <h2 id="modal-title" className="text-2xl font-bold text-white mb-2">
            Content Restricted
          </h2>
          <p className="text-gray-400 mb-6 capitalize">
            {formatReason(reason)}
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-lg text-lg font-semibold transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 focus:ring-red-500/50 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyModal;
