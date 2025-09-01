import { RefObject, useEffect, useRef } from 'react';

const getFocusable = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  const nodes = root.querySelectorAll<HTMLElement>(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
  );
  return Array.from(nodes).filter(el => el.offsetParent !== null || el === document.activeElement);
};

export function useFocusTrap(containerRef: RefObject<HTMLElement>, active: boolean) {
  const prevFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;
    prevFocused.current = document.activeElement as HTMLElement | null;

    const focusables = getFocusable(root);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      try { root.focus?.(); } catch {}
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key !== 'Tab') return;
      const currentRoot = containerRef.current;
      if (!currentRoot) return;
      const els = getFocusable(currentRoot);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      try { prevFocused.current?.focus(); } catch {}
    };
  }, [active, containerRef]);
}
