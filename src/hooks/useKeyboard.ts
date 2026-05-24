import { useEffect } from 'react';

/**
 * Hook to register keyboard shortcuts for the Gantt canvas.
 * Attaches globally when the component is mounted.
 */
export function useKeyboard(
  handlers: {
    onKeyDown?: (e: KeyboardEvent) => void;
    onKeyUp?: (e: KeyboardEvent) => void;
  },
): void {
  useEffect(() => {
    const { onKeyDown, onKeyUp } = handlers;

    if (onKeyDown) window.addEventListener('keydown', onKeyDown);
    if (onKeyUp) window.addEventListener('keyup', onKeyUp);

    return () => {
      if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
      if (onKeyUp) window.removeEventListener('keyup', onKeyUp);
    };
  }, [handlers.onKeyDown, handlers.onKeyUp]);
}
