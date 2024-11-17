import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
import type { NotificationType } from '../../types/notifications';
import type { NotificationPreferencesResponse } from '../../types/socket-events';

interface NotificationPreferences {
  web: NotificationType[];
  gotify: NotificationType[];
  desktop: NotificationType[];
}

interface UseNotificationPreferencesOptions {
  userId: string;
}

interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  loading: boolean;
  error: string | null;
  updatePreferences: (channel: keyof NotificationPreferences, types: NotificationType[]) => Promise<void>;
}

export function useNotificationPreferences({ userId }: UseNotificationPreferencesOptions): UseNotificationPreferencesResult {
  const socket = useSocket();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    web: [],
    gotify: [],
    desktop: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      setLoading(true);
      const response = await new Promise<NotificationPreferencesResponse>((resolve) => {
        socket.emit('notifications:preferences:get', { userId }, (response: NotificationPreferencesResponse) => {
          resolve(response);
        });
      });

      if (response.success && response.data) {
        setPreferences(response.data);
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to load preferences');
      }
    } catch (err) {
      logger.error('Failed to load notification preferences:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [socket, userId]);

  const updatePreferences = useCallback(async (channel: keyof NotificationPreferences, types: NotificationType[]) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      const response = await new Promise<NotificationPreferencesResponse>((resolve) => {
        socket.emit('notifications:preferences:update', { userId, channel, types }, (response: NotificationPreferencesResponse) => {
          resolve(response);
        });
      });

      if (response.success) {
        setPreferences(prev => ({
          ...prev,
          [channel]: types
        }));
      } else {
        throw new Error(response.error || 'Failed to update preferences');
      }
    } catch (err) {
      logger.error('Failed to update notification preferences:', err);
      throw err;
    }
  }, [socket, userId]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences
  };
}
