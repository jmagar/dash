import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
import type { DesktopNotification } from '../../types/notifications';

interface UseDesktopNotificationsResult {
  requestPermission: () => Promise<boolean>;
  showNotification: (notification: DesktopNotification) => void;
  enabled: boolean;
}

export function useDesktopNotifications(): UseDesktopNotificationsResult {
  const socket = useSocket();

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

    const handleNotification = (...args: unknown[]) => {
      const [data] = args;
      const notification = data as DesktopNotification;
      void showNotification(notification);
    };

    socket.on('notification:desktop', handleNotification);

    return () => {
      socket.off('notification:desktop', handleNotification);
    };
  }, [socket, showNotification]);

  return {
    requestPermission,
    showNotification,
    enabled: 'Notification' in window && Notification.permission === 'granted',
  };
}