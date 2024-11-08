import { useState, useCallback, useEffect } from 'react';

export interface UseAsyncOptions<T> {
  immediate?: boolean;
  deps?: any[];
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T>;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {},
): UseAsyncResult<T> {
  const { immediate = false, deps = [], onSuccess, onError } = options;
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFunction(...args);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, onSuccess, onError],
  );

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [immediate, execute, ...deps]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    setError,
    clearError,
  };
}

export default useAsync;
