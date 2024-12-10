import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import type { NotificationSeverity } from '../store/types';

export function useNotification() {
  const { enqueueSnackbar } = useSnackbar();

  const showNotification = useCallback((message: string, severity: NotificationSeverity = 'info') => {
    enqueueSnackbar(message, {
      variant: severity,
      autoHideDuration: 3000,
    });
  }, [enqueueSnackbar]);

  return { showNotification };
} 