import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { NotificationSeverity } from '../store/types';
import type { AnyAction } from '@reduxjs/toolkit';

interface ShowNotificationPayload {
  message: string;
  severity: NotificationSeverity;
}

const showNotification = (payload: ShowNotificationPayload): AnyAction => ({
  type: 'notification/showNotification',
  payload,
});

export function useSnackbar() {
  const dispatch = useDispatch();

  const showSnackbar = useCallback((message: string, severity: NotificationSeverity): void => {
    dispatch(showNotification({ message, severity }));
  }, [dispatch]);

  return { showSnackbar };
}
