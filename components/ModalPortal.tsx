import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

// Renders children into a detached DOM node appended to <body>.
// Also marks the app root as aria-hidden to improve screen reader behavior.
const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const elRef = useRef<HTMLDivElement | null>(null);
  const prevAriaHidden = useRef<string | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement('div');
    elRef.current.className = 'modal-portal-root';
  }

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);

    const appRoot = document.getElementById('root');
    if (appRoot) {
      prevAriaHidden.current = appRoot.getAttribute('aria-hidden');
      appRoot.setAttribute('aria-hidden', 'true');
      // Optional inert hint; browser support varies
      (appRoot as any).inert = true;
    }

    return () => {
      try { document.body.removeChild(el); } catch {}
      if (appRoot) {
        if (prevAriaHidden.current === null) appRoot.removeAttribute('aria-hidden');
        else appRoot.setAttribute('aria-hidden', prevAriaHidden.current);
        (appRoot as any).inert = false;
      }
    };
  }, []);

  return createPortal(children, elRef.current);
};

export default ModalPortal;

