import { useState, useCallback } from 'react';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface UseAsyncActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export function useAsyncAction<T>({ onSuccess, onError, onSettled }: UseAsyncActionOptions<T> = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      loggerLoggingManager.getInstance().();
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setLoading(false);
      onSettled?.();
    }
  }, [onSuccess, onError, onSettled]);

  return {
    execute,
    loading,
    error,
    setError,
  };
}

