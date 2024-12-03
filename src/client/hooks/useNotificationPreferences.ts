import { useCallback } from 'react';
import { socket } from '../socket';
import { logger } from '../utils/frontendLogger';
import { useQuery } from './useQuery';
import { useMutation } from './useMutation';

import type { NotificationPreferences, NotificationType } from '@/types/notifications';
import type { NotificationPreferencesResponse } from '@/types/socket-events';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

interface UseNotificationPreferencesOptions {
  userId: string;
  enabled?: boolean;
}

interface UpdatePreferencesVariables {
  channel: keyof NotificationPreferences;
  types: NotificationType[];
}

export function useNotificationPreferences({ userId, enabled = true }: UseNotificationPreferencesOptions) {
  // Query for loading preferences
  const fetchPreferences = useCallback(async () => {
    return new Promise<NotificationPreferences>((resolve, reject) => {
      socket.emit('notifications:preferences:get', { userId }, (response: NotificationPreferencesResponse) => {
        if (response.success && response.data?.preferences) {
          resolve(response.data.preferences);
        } else {
          reject(new Error(response.error || 'Failed to load notification preferences'));
        }
      });
    });
  }, [userId]);

  const {
    data: preferences,
    isLoading: loading,
    error,
    refetch: loadPreferences
  } = useQuery(fetchPreferences, {
    enabled,
    onError: (err) => {
      loggerLoggingManager.getInstance().();
    }
  });

  // Mutation for updating preferences
  const updatePreferencesFn = useCallback(async ({ channel, types }: UpdatePreferencesVariables) => {
    if (!enabled) return preferences;
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
            resolve(response.data.preferences);
          } else {
            reject(new Error(response.error || 'Failed to update notification preferences'));
          }
        }
      );
    });
  }, [userId, preferences, enabled]);

  const [updatePreferences, updateState] = useMutation(updatePreferencesFn, {
    onError: (err) => {
      loggerLoggingManager.getInstance().();
    }
  });

  return {
    preferences,
    loading: loading || updateState.isLoading,
    error: error || updateState.error,
    loadPreferences: enabled ? loadPreferences : () => Promise.resolve(),
    updatePreferences: (channel: keyof NotificationPreferences, types: NotificationType[]) =>
      updatePreferences({ channel, types }),
  };
}

