import { useCallback, useEffect, useReducer, useRef } from 'react';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

interface QueryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
}

interface QueryConfig<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  refetchInterval?: number;
}

type QueryAction<T> =
  | { type: 'loading' }
  | { type: 'success'; payload: T }
  | { type: 'error'; payload: Error };

function queryReducer<T>(state: QueryState<T>, action: QueryAction<T>): QueryState<T> {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: true, error: null };
    case 'success':
      return {
        data: action.payload,
        error: null,
        isLoading: false,
        isError: false,
      };
    case 'error':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isError: true,
      };
    default:
      return state;
  }
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  config: QueryConfig<T> = {}
): QueryState<T> & { refetch: () => Promise<void> } {
  const {
    enabled = true,
    onSuccess,
    onError,
    refetchInterval,
  } = config;

  const [state, dispatch] = useReducer(queryReducer<T>, {
    data: null,
    error: null,
    isLoading: true,
    isError: false,
  });

  const refetchIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      dispatch({ type: 'loading' });
      const data = await queryFn();
      
      if (mountedRef.current) {
        dispatch({ type: 'success', payload: data });
        onSuccess?.(data);
      }
    } catch (error) {
      loggerLoggingManager.getInstance().();

      if (mountedRef.current) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        dispatch({ type: 'error', payload: errorObj });
        onError?.(errorObj);
      }
    }
  }, [queryFn, enabled, onSuccess, onError]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();

    if (refetchInterval) {
      refetchIntervalRef.current = setInterval(() => {
        void fetchData();
      }, refetchInterval);
    }

    return () => {
      mountedRef.current = false;
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [fetchData, refetchInterval]);

  return {
    ...state,
    refetch: fetchData,
  };
}

