import { useEffect, useRef, useState, RefObject } from 'react';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  enabled?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export interface UseIntersectionObserverResult<T extends HTMLElement> {
  ref: RefObject<T>;
  isVisible: boolean;
}

export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): [RefObject<T>, boolean] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
    enabled = true,
    onVisibilityChange,
  } = options;

  const elementRef = useRef<T>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const frozen = useRef<boolean>(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled || frozen.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementVisible = entry.isIntersecting;
        setIsVisible(isElementVisible);
        onVisibilityChange?.(isElementVisible);

        if (freezeOnceVisible && isElementVisible) {
          frozen.current = true;
          observer.unobserve(element);
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [
    threshold,
    root,
    rootMargin,
    freezeOnceVisible,
    enabled,
    onVisibilityChange,
  ]);

  return [elementRef, isVisible];
}

export default useIntersectionObserver;
