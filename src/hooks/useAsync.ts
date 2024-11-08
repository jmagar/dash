import { useState, useEffect, useCallback, DependencyList } from 'react';

export interface UseAsyncOptions<_T> {
  immediate?: boolean;
  deps?: DependencyList;
}

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: () => Promise<T>;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions<T> = {},
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback((): Promise<T> => {
    setLoading(true);
    setError(null);

    return asyncFunction()
      .then((response) => {
        setData(response);
        setLoading(false);
        return response;
      })
      .catch((error) => {
        setError(error.message || 'An error occurred');
        setLoading(false);
        throw error;
      });
  }, [asyncFunction]);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, options.immediate, ...(options.deps || [])]);

  return {
    data,
    loading,
    error,
    execute,
  };
}

export default useAsync;
