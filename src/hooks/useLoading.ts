import { useState, useCallback } from 'react';

interface UseLoadingResult {
  loading: boolean;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
  clearError: () => void;
}

export const useLoading = (initialLoading = false): UseLoadingResult => {
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const withLoading = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await promise;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setLoading,
    setError,
    withLoading,
    clearError,
  };
};

export default useLoading;
