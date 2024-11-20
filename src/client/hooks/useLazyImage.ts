import { useState, useEffect, useRef } from 'react';

interface UseLazyImageOptions {
  src: string;
  threshold?: number;
  rootMargin?: string;
}

interface UseLazyImageReturn {
  isLoading: boolean;
  isVisible: boolean;
  error: boolean;
  ref: React.RefObject<HTMLElement>;
}

export function useLazyImage({
  src,
  threshold = 0.1,
  rootMargin = '50px',
}: UseLazyImageOptions): UseLazyImageReturn {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isVisible || !src) return;

    const image = new Image();
    image.src = src;

    image.onload = () => {
      setIsLoading(false);
      setError(false);
    };

    image.onerror = () => {
      setIsLoading(false);
      setError(true);
    };

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [isVisible, src]);

  return {
    isLoading: isVisible && isLoading,
    isVisible,
    error,
    ref,
  };
}
