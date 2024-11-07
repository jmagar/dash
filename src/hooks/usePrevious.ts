import { useRef, useEffect } from 'react';

/**
 * A hook that returns the previous value of a variable.
 *
 * @param value The value to track
 * @returns The previous value
 *
 * @example
 * ```tsx
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 *
 * console.log(`Current: ${count}, Previous: ${prevCount}`);
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
