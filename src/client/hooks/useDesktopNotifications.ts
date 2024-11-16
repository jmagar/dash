import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { NotificationDesktopEvent } from '../../types/notifications';

export function useDesktopNotifications() {
  const socket = useSocket();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const showNotification = useCallback(({ title, message, icon, link }: NotificationDesktopEvent) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body: message,
      icon: icon || '/favicon.ico',
    });

    if (link) {
      notification.onclick = () => {
        window.open(link, '_blank');
        notification.close();
      };
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:desktop', (data: unknown) => {
      const event = data as NotificationDesktopEvent;
      showNotification(event);
    });

    return () => {
      socket.off('notification:desktop');
    };
  }, [socket, showNotification]);

  return {
    requestPermission,
    showNotification,
  };
}
