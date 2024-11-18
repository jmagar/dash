import { useState, useCallback } from 'react';
import { socket } from '../socket';
import type { NotificationPreferences, NotificationType } from '@/types/notifications';
import type { NotificationPreferencesResponse } from '@/types/socket-events';
import { logger } from '../utils/frontendLogger';

export function useNotificationPreferences(userId: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
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
  }, [userId]);

  const updatePreferences = useCallback(async (channel: keyof NotificationPreferences, types: NotificationType[]) => {
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
  }, [userId, preferences]);

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
  };
}
