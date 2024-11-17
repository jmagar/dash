import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
import type { NotificationType } from '../../types/notifications';
import type { NotificationPreferencesResponse } from '../../types/socket-events';

interface NotificationPreferencesV2 {
  webEnabled: boolean;
  gotifyEnabled: boolean;
  desktopEnabled: boolean;
  alertTypes: {
    [K in NotificationType]: boolean;
  };
}

interface UseNotificationPreferencesOptions {
  userId: string;
}

interface UseNotificationPreferencesResult {
  preferences: NotificationPreferencesV2 | null;
  loading: boolean;
  error: Error | null;
  updatePreferences: (newPreferences: NotificationPreferencesV2) => Promise<boolean>;
}

// Convert array-based preferences to boolean-based
function convertToV2Format(data: NotificationPreferencesResponse['data']): NotificationPreferencesV2 {
  if (!data) {
    return {
      webEnabled: false,
      gotifyEnabled: false,
      desktopEnabled: false,
      alertTypes: {
        alert: false,
        error: false,
        warning: false,
        info: false,
        success: false
      }
    };
  }

  return {
    webEnabled: data.web.length > 0,
    gotifyEnabled: data.gotify.length > 0,
    desktopEnabled: data.desktop.length > 0,
    alertTypes: {
      alert: data.web.includes('alert'),
      error: data.web.includes('error'),
      warning: data.web.includes('warning'),
      info: data.web.includes('info'),
      success: data.web.includes('success')
    }
  };
}

export function useNotificationPreferences({ userId }: UseNotificationPreferencesOptions): UseNotificationPreferencesResult {
  const socket = useSocket();
  const [preferences, setPreferences] = useState<NotificationPreferencesV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!socket) {
      setError(new Error('Socket not connected'));
      return;
    }

    try {
      setLoading(true);
      const response = await new Promise<NotificationPreferencesResponse>((resolve) => {
        socket.emit('notifications:preferences:get', { userId }, (response) => {
          resolve(response);
        });
      });

      if (response.success && response.data) {
        setPreferences(convertToV2Format(response.data));
        setError(null);
      } else {
        throw new Error(response.error || 'Failed to load preferences');
      }
    } catch (err) {
      logger.error('Failed to load notification preferences', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [socket, userId]);

  const updatePreferences = useCallback(async (newPreferences: NotificationPreferencesV2): Promise<boolean> => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      // Convert boolean preferences to array format for each channel
      const updateChannels = async (channel: 'web' | 'gotify' | 'desktop'): Promise<boolean> => {
        const enabled = newPreferences[`${channel}Enabled`];
        const types = enabled
          ? (Object.entries(newPreferences.alertTypes)
              .filter(([_, isEnabled]) => isEnabled)
              .map(([type]) => type)) as NotificationType[]
          : [];

        const response = await new Promise<NotificationPreferencesResponse>((resolve) => {
          socket.emit('notifications:preferences:update', {
            userId,
            channel,
            types
          }, (response) => {
            resolve(response);
          });
        });

        return response.success;
      };

      // Update each channel
      const results = await Promise.all([
        updateChannels('web'),
        updateChannels('gotify'),
        updateChannels('desktop')
      ]);

      const success = results.every(Boolean);
      if (success) {
        setPreferences(newPreferences);
      }
      return success;
    } catch (err) {
      logger.error('Failed to update notification preferences', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return false;
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
