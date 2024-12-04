import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

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

      loggerLoggingManager.getInstance().();
      const response = await asyncFunctionRef.current();

      loggerLoggingManager.getInstance().();
      setData(response);
      setLoading(false);

      if (onSuccessRef.current) {
        onSuccessRef.current(response);
      }

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      loggerLoggingManager.getInstance().();

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

