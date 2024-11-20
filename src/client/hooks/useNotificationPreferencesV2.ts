import { useState, useCallback } from 'react';

import { socket } from '../socket';
import { logger } from '../utils/frontendLogger';

import type { NotificationPreferences, NotificationType } from '../../types/notifications';
import type { NotificationPreferencesResponse } from '../../types/socket-events';

interface UseNotificationPreferencesOptions {
  userId: string;
  enabled?: boolean;
}

export function useNotificationPreferencesV2({ userId, enabled = true }: UseNotificationPreferencesOptions) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      return new Promise<NotificationPreferences>((resolve, reject) => {
        socket.emit('notifications:preferences:get', { userId }, (response: NotificationPreferencesResponse) => {
          if (response.success && response.data?.preferences) {
            setPreferences(response.data.preferences);
            resolve(response.data.preferences);
          } else {
            const errorMessage = response.error || 'Failed to load notification preferences';
            setError(errorMessage);
            reject(new Error(errorMessage));
          }
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to load notification preferences:', { error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, enabled]);

  const updatePreferences = useCallback(async (channel: keyof NotificationPreferences, types: NotificationType[]) => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      if (!preferences) {
        throw new Error('Preferences not loaded');
      }

      const updatedPreferences: NotificationPreferences = {
        ...preferences,
        [channel]: types,
      };

      return new Promise<NotificationPreferences>((resolve, reject) => {
        socket.emit('notifications:preferences:update',
          { userId, preferences: updatedPreferences },
          (response: NotificationPreferencesResponse) => {
            if (response.success && response.data?.preferences) {
              setPreferences(response.data.preferences);
              resolve(response.data.preferences);
            } else {
              const errorMessage = response.error || 'Failed to update notification preferences';
              setError(errorMessage);
              reject(new Error(errorMessage));
            }
          }
        );
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to update notification preferences:', { error: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, preferences, enabled]);

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
  };
}
