import { useEffect } from 'react';

// Simple body scroll lock to prevent background from moving while modal is open
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const { style } = document.body;
    const prev = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = prev;
    };
  }, [active]);
}

