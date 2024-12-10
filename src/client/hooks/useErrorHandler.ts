import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { logger } from '../utils/frontendLogger';

export function useErrorHandler() {
  const { enqueueSnackbar } = useSnackbar();

  const handleError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    logger.error(message, { error });
    enqueueSnackbar(message, { variant: 'error' });
  }, [enqueueSnackbar]);

  return { handleError };
} 