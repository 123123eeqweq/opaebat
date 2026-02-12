'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for modal accessibility: ESC to close, focus trap, restore focus on close.
 * @param isOpen - whether the modal is open
 * @param onClose - callback when modal should close (ESC or backdrop click)
 * @param options - optional: focusFirstSelector to focus specific element on open
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  options?: { focusFirstSelector?: string }
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap: keep focus inside modal
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = options?.focusFirstSelector
      ? container.querySelector<HTMLElement>(options.focusFirstSelector)
      : focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => {
      container.removeEventListener('keydown', handleTab);
      previousActiveRef.current?.focus();
    };
  }, [isOpen, options?.focusFirstSelector]);

  return containerRef;
}
