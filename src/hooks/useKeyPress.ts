import { useEffect } from 'react';

export interface UseKeyPressOptions {
  event?: 'keydown' | 'keyup' | 'keypress';
  target?: Window | HTMLElement;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

type KeyHandler = (event: KeyboardEvent) => void;
type KeyFilter = string | ((event: KeyboardEvent) => boolean);

export function useKeyPress(
  key: KeyFilter,
  handler: KeyHandler,
  options: UseKeyPressOptions = {}
): void {
  const {
    event = 'keydown',
    target = typeof window !== 'undefined' ? window : undefined,
    preventDefault = false,
    stopPropagation = false,
  } = options;

  useEffect(() => {
    if (!target) return;

    const listener = (e: Event): void => {
      if (!(e instanceof KeyboardEvent)) return;

      const shouldHandle = typeof key === 'string'
        ? e.key === key
        : key(e);

      if (shouldHandle) {
        if (preventDefault) {
          e.preventDefault();
        }
        if (stopPropagation) {
          e.stopPropagation();
        }
        handler(e);
      }
    };

    target.addEventListener(event, listener as EventListener);
    return () => target.removeEventListener(event, listener as EventListener);
  }, [key, handler, event, target, preventDefault, stopPropagation]);
}

// Predefined key filters
export const isEnter = (e: KeyboardEvent): boolean => e.key === 'Enter';
export const isEscape = (e: KeyboardEvent): boolean => e.key === 'Escape';
export const isSpace = (e: KeyboardEvent): boolean => e.key === ' ';
export const isArrowUp = (e: KeyboardEvent): boolean => e.key === 'ArrowUp';
export const isArrowDown = (e: KeyboardEvent): boolean => e.key === 'ArrowDown';
export const isArrowLeft = (e: KeyboardEvent): boolean => e.key === 'ArrowLeft';
export const isArrowRight = (e: KeyboardEvent): boolean => e.key === 'ArrowRight';
export const isTab = (e: KeyboardEvent): boolean => e.key === 'Tab';
export const isDelete = (e: KeyboardEvent): boolean => e.key === 'Delete';
export const isBackspace = (e: KeyboardEvent): boolean => e.key === 'Backspace';

// Modifier key helpers
export const withCtrl = (filter: KeyFilter): ((e: KeyboardEvent) => boolean) => {
  return (e: KeyboardEvent): boolean => {
    const baseCheck = typeof filter === 'string' ? e.key === filter : filter(e);
    return e.ctrlKey && baseCheck;
  };
};

export const withShift = (filter: KeyFilter): ((e: KeyboardEvent) => boolean) => {
  return (e: KeyboardEvent): boolean => {
    const baseCheck = typeof filter === 'string' ? e.key === filter : filter(e);
    return e.shiftKey && baseCheck;
  };
};

export const withAlt = (filter: KeyFilter): ((e: KeyboardEvent) => boolean) => {
  return (e: KeyboardEvent): boolean => {
    const baseCheck = typeof filter === 'string' ? e.key === filter : filter(e);
    return e.altKey && baseCheck;
  };
};

export default useKeyPress;
