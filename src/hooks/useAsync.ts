import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseAsyncOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  immediate?: boolean;
  deps?: unknown[];
}

export interface UseAsyncResult<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  execute: (...args: unknown[]) => Promise<T>;
  clearError: () => void;
  setError: (error: string) => void;
}

export function useAsync<T>(
  asyncFunction: (...args: unknown[]) => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncResult<T> {
  const { onSuccess, onError, immediate = false, deps = [] } = options;
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const mounted = useRef<boolean>(true);

  // Store the options in a ref to avoid unnecessary reruns of useEffect
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T> => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFunction(...args);
        if (mounted.current) {
          setData(result);
          optionsRef.current.onSuccess?.(result);
        }
        return result;
      } catch (err) {
        if (mounted.current) {
          const error = err instanceof Error ? err : new Error('An error occurred');
          setError(error.message);
          optionsRef.current.onError?.(error);
        }
        throw err;
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [asyncFunction]
  );

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [...deps, execute]);

  return {
    loading,
    error,
    data,
    execute,
    clearError,
    setError,
  };
}

export default useAsync;
