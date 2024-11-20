import { useCallback, useEffect, useReducer, useRef } from 'react';
import { logger } from '../utils/frontendLogger';

interface PageParam {
  pageParam?: number;
}

interface InfiniteQueryState<T> {
  pages: T[];
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

interface InfiniteQueryConfig<T> {
  enabled?: boolean;
  getNextPageParam?: (lastPage: T, allPages: T[]) => number | undefined;
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

type InfiniteQueryAction<T> =
  | { type: 'loading' }
  | { type: 'success'; payload: T }
  | { type: 'error'; payload: Error }
  | { type: 'fetchNextPage' }
  | { type: 'nextPageSuccess'; payload: T }
  | { type: 'nextPageError'; payload: Error };

function infiniteQueryReducer<T>(
  state: InfiniteQueryState<T>,
  action: InfiniteQueryAction<T>
): InfiniteQueryState<T> {
  switch (action.type) {
    case 'loading':
      return { ...state, isLoading: true, error: null };
    case 'success':
      return {
        ...state,
        pages: [action.payload],
        error: null,
        isLoading: false,
        isError: false,
        hasNextPage: true,
      };
    case 'error':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isError: true,
      };
    case 'fetchNextPage':
      return {
        ...state,
        isFetchingNextPage: true,
      };
    case 'nextPageSuccess':
      return {
        ...state,
        pages: [...state.pages, action.payload],
        isFetchingNextPage: false,
        hasNextPage: true,
      };
    case 'nextPageError':
      return {
        ...state,
        error: action.payload,
        isFetchingNextPage: false,
        hasNextPage: false,
      };
    default:
      return state;
  }
}

export function useInfiniteQuery<T>(
  queryFn: (params: PageParam) => Promise<T>,
  config: InfiniteQueryConfig<T> = {}
): InfiniteQueryState<T> & {
  fetchNextPage: () => Promise<void>;
} {
  const {
    enabled = true,
    getNextPageParam,
    onSuccess,
    onError,
  } = config;

  const [state, dispatch] = useReducer(infiniteQueryReducer<T>, {
    pages: [],
    error: null,
    isLoading: true,
    isError: false,
    hasNextPage: true,
    isFetchingNextPage: false,
  });

  const mountedRef = useRef(true);

  const fetchInitialData = useCallback(async () => {
    if (!enabled) return;

    try {
      dispatch({ type: 'loading' });
      const data = await queryFn({ pageParam: 0 });
      
      if (mountedRef.current) {
        dispatch({ type: 'success', payload: data });
        onSuccess?.([data]);
      }
    } catch (error) {
      logger.error('Infinite query error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (mountedRef.current) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        dispatch({ type: 'error', payload: errorObj });
        onError?.(errorObj);
      }
    }
  }, [queryFn, enabled, onSuccess, onError]);

  const fetchNextPage = useCallback(async () => {
    if (!state.hasNextPage || state.isFetchingNextPage) return;

    const nextPageParam = getNextPageParam?.(
      state.pages[state.pages.length - 1],
      state.pages
    );

    if (nextPageParam === undefined) {
      return;
    }

    try {
      dispatch({ type: 'fetchNextPage' });
      const data = await queryFn({ pageParam: nextPageParam });

      if (mountedRef.current) {
        dispatch({ type: 'nextPageSuccess', payload: data });
        onSuccess?.([...state.pages, data]);
      }
    } catch (error) {
      logger.error('Infinite query next page error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (mountedRef.current) {
        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        dispatch({ type: 'nextPageError', payload: errorObj });
        onError?.(errorObj);
      }
    }
  }, [
    queryFn,
    getNextPageParam,
    onSuccess,
    onError,
    state.pages,
    state.hasNextPage,
    state.isFetchingNextPage,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    fetchInitialData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchInitialData]);

  return {
    ...state,
    fetchNextPage,
  };
}
