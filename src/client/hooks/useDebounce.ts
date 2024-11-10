import { useState, useEffect } from 'react';

export interface UseDebounceOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * A hook that returns a debounced value that only updates after the specified
 * delay has passed without any new updates.
 *
 * @param value The value to debounce
 * @param options Debounce options including delay, maxWait, leading, and trailing
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, { delay: 500 });
 *
 * useEffect(() => {
 *   // This will only run 500ms after the last search update
 *   performSearch(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, options: UseDebounceOptions | number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [lastCallTime, setLastCallTime] = useState<number>(Date.now());

  // Handle both object and number options
  const {
    delay,
    maxWait = 0,
    leading = false,
    trailing = true,
  } = typeof options === 'number' ? { delay: options } : options;

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    const shouldCallImmediately = leading && timeSinceLastCall >= delay;
    const hasReachedMaxWait = maxWait > 0 && timeSinceLastCall >= maxWait;

    if (shouldCallImmediately || hasReachedMaxWait) {
      setDebouncedValue(value);
      setLastCallTime(now);
      return;
    }

    const timeoutId = setTimeout(() => {
      if (trailing) {
        setDebouncedValue(value);
        setLastCallTime(Date.now());
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay, maxWait, leading, trailing, lastCallTime]);

  return debouncedValue;
}

export default useDebounce;
