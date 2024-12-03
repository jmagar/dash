import { useEffect, useCallback } from 'react';
import { logger } from '../utils/frontendLogger';
import { useSocket } from './useSocket';
import type { DesktopNotification } from '../../types/notifications';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

interface UseDesktopNotificationsResult {
  requestPermission: () => Promise<boolean>;
  showNotification: (notification: DesktopNotification) => void;
  enabled: boolean;
}

export function useDesktopNotifications(): UseDesktopNotificationsResult {
  const { socket, on } = useSocket({
    autoReconnect: true,
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      loggerLoggingManager.getInstance().();
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        loggerLoggingManager.getInstance().(),
        });
        return false;
      }
    }

    return false;
  }, []);

  const showNotification = useCallback(({
    title,
    message,
    type = 'info',
    icon,
    link,
    duration = 5000,
  }: DesktopNotification) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        icon: icon || '/favicon.ico',
        tag: type,
      });

      if (link) {
        notification.onclick = () => {
          window.open(link, '_blank');
          notification.close();
        };
      }

      if (duration > 0) {
        setTimeout(() => notification.close(), duration);
      }
    } catch (error) {
      loggerLoggingManager.getInstance().(),
        title,
        message,
      });
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleDesktopNotification = (notification: DesktopNotification) => {
      void showNotification(notification);
    };

    const unsubDesktopNotification = on('notification:desktop', handleDesktopNotification);

    return () => {
      unsubDesktopNotification();
    };
  }, [socket, showNotification, on]);

  return {
    requestPermission,
    showNotification,
    enabled: 'Notification' in window && Notification.permission === 'granted',
  };
}

