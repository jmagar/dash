import { useState, useEffect, useRef } from 'react';

export interface UseThrottleOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * A hook that returns a throttled value that only updates at most once
 * in the specified time interval.
 *
 * @param value The value to throttle
 * @param options Throttle options including delay, maxWait, leading, and trailing
 * @returns The throttled value
 *
 * @example
 * ```tsx
 * const [value, setValue] = useState('');
 * const throttledValue = useThrottle(value, { delay: 1000 });
 *
 * // Value will update at most once per second
 * useEffect(() => {
 *   console.log('Throttled value:', throttledValue);
 * }, [throttledValue]);
 * ```
 */
export function useThrottle<T>(
  value: T,
  options: UseThrottleOptions | number,
): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef<boolean>(true);

  // Handle both object and number options
  const {
    delay,
    maxWait = 0,
    leading = false,
    trailing = true,
  } = typeof options === 'number' ? { delay: options } : options;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRan.current;
    const shouldRunImmediately = leading && timeSinceLastRun >= delay;
    const hasReachedMaxWait = maxWait > 0 && timeSinceLastRun >= maxWait;

    if (shouldRunImmediately || hasReachedMaxWait) {
      if (mountedRef.current) {
        setThrottledValue(value);
        lastRan.current = now;
      }
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      }, delay - (now - lastRan.current));
    }
  }, [value, delay, maxWait, leading, trailing]);

  return throttledValue;
}

export default useThrottle;
