import { useCallback, useReducer } from 'react';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

interface MutationState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

interface MutationConfig<T, V> {
  onSuccess?: (data: T, variables: V) => void | Promise<void>;
  onError?: (error: Error, variables: V) => void | Promise<void>;
  onSettled?: (data: T | null, error: Error | null, variables: V) => void | Promise<void>;
}

type MutationAction<T> =
  | { type: 'loading' }
  | { type: 'success'; payload: T }
  | { type: 'error'; payload: Error }
  | { type: 'reset' };

function mutationReducer<T>(state: MutationState<T>, action: MutationAction<T>): MutationState<T> {
  switch (action.type) {
    case 'loading':
      return {
        ...state,
        isLoading: true,
        error: null,
        isError: false,
        isSuccess: false,
      };
    case 'success':
      return {
        data: action.payload,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      };
    case 'error':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isError: true,
        isSuccess: false,
      };
    case 'reset':
      return {
        data: null,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: false,
      };
    default:
      return state;
  }
}

export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  config: MutationConfig<T, V> = {}
): [
  (variables: V) => Promise<T>,
  MutationState<T> & { reset: () => void }
] {
  const { onSuccess, onError, onSettled } = config;

  const [state, dispatch] = useReducer(mutationReducer<T>, {
    data: null,
    error: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const mutate = useCallback(
    async (variables: V): Promise<T> => {
      dispatch({ type: 'loading' });

      try {
        const data = await mutationFn(variables);
        dispatch({ type: 'success', payload: data });
        await onSuccess?.(data, variables);
        await onSettled?.(data, null, variables);
        return data;
      } catch (error) {
        loggerLoggingManager.getInstance().();

        const errorObj = error instanceof Error ? error : new Error('Unknown error');
        dispatch({ type: 'error', payload: errorObj });
        await onError?.(errorObj, variables);
        await onSettled?.(null, errorObj, variables);
        throw errorObj;
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  return [
    mutate,
    {
      ...state,
      reset,
    },
  ];
}

