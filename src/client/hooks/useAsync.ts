import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

import { logger } from '../utils/frontendLogger';

export interface UseAsyncOptions<T> {
  immediate?: boolean;
  deps?: DependencyList;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
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
  const {
    immediate = false,
    deps = [],
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to store the latest callbacks
  const asyncFunctionRef = useRef(asyncFunction);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [asyncFunction, onSuccess, onError]);

  const execute = useCallback(async (): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('Starting async operation');
      const response = await asyncFunctionRef.current();

      logger.debug('Async operation completed successfully');
      setData(response);
      setLoading(false);

      if (onSuccessRef.current) {
        onSuccessRef.current(response);
      }

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      logger.error('Async operation failed:', {
        error: error.message,
        stack: error.stack,
      });

      setError(error.message);
      setLoading(false);

      if (onErrorRef.current) {
        onErrorRef.current(error);
      }

      throw error;
    }
  }, []); // No dependencies needed since we use refs

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [execute, immediate, ...deps]);

  return {
    data,
    loading,
    error,
    execute,
  };
}

export default useAsync;
