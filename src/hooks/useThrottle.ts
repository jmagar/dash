import { useState, useEffect, useRef } from 'react';

/**
 * A hook that returns a throttled value that only updates at most once
 * in the specified time interval.
 * @param value The value to throttle
 * @param limit The minimum time (in milliseconds) between updates
 * @returns The throttled value
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (): void => {
      const now = Date.now();
      if (now - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = now;
      } else {
        // Schedule the update for when the throttle period ends
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }, limit - (now - lastRan.current));
      }
    };

    handler();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, limit]);

  return throttledValue;
}

export default useThrottle;
