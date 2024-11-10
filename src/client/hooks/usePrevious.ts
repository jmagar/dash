import { useEffect, useRef } from 'react';

/**
 * A hook that returns the previous value of a variable.
 *
 * @template T The type of the value to track
 * @param value The value to track
 * @returns The previous value (undefined on first render)
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 *
 * useEffect(() => {
 *   console.log('Previous count:', prevCount);
 *   console.log('Current count:', count);
 * }, [count, prevCount]);
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePrevious;
