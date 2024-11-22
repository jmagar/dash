import { useEffect, useCallback } from 'react';
import { logger } from '../utils/frontendLogger';
import { useSocket } from './useSocket';
import type { DesktopNotification } from '../../types/notifications';

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
      logger.warn('This browser does not support desktop notifications');
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
        logger.error('Failed to request notification permission:', {
          error: error instanceof Error ? error.message : String(error),
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
      logger.error('Failed to show desktop notification:', {
        error: error instanceof Error ? error.message : String(error),
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
