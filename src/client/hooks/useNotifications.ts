import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
import { 
  NotificationEntity, 
  NotificationType, 
  NotificationEvent,
  ApiResult 
} from '../../types/notifications';
import { notificationsClient } from '../api/notifications.client';
import { ServiceOperationError } from '../../types/errors';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface UseNotificationsOptions {
  userId: string;
  limit?: number;
  type?: NotificationType;
}

interface UseNotificationsResult {
  notifications: NotificationEntity[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications({ userId, limit = 50, type }: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, on } = useSocket({
    autoReconnect: true,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationsClient.getNotifications({ userId, limit, type });
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        throw new ServiceOperationError(
          response.error || 'Failed to fetch notifications',
          'fetchNotifications',
          { userId, limit, type }
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch notifications';
      loggerLoggingManager.getInstance().();
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [userId, limit, type]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setError(null);
      const response = await notificationsClient.markAsRead(notificationId);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
          )
        );
      } else {
        throw new ServiceOperationError(
          response.error || 'Failed to mark notification as read',
          'markAsRead',
          { notificationId }
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark notification as read';
      loggerLoggingManager.getInstance().();
      setError(errorMsg);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const response = await notificationsClient.markAllAsRead(unreadIds);
      if (response.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true, readAt: new Date() }))
        );
      } else {
        throw new ServiceOperationError(
          response.error || 'Failed to mark all notifications as read',
          'markAllAsRead',
          { unreadIds }
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
      loggerLoggingManager.getInstance().();
      setError(errorMsg);
      throw error;
    }
  }, [notifications, userId]);

  const clearNotifications = useCallback(async () => {
    try {
      setError(null);
      const notificationIds = notifications.map(n => n.id);
      const response = await notificationsClient.deleteNotifications(notificationIds);
      if (response.success) {
        setNotifications([]);
      } else {
        throw new ServiceOperationError(
          response.error || 'Failed to clear notifications',
          'clearNotifications',
          { notificationIds }
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to clear notifications';
      loggerLoggingManager.getInstance().();
      setError(errorMsg);
      throw error;
    }
  }, [notifications, userId]);

  useEffect(() => {
    if (!socket) return;

    const handleNotificationEvent = (event: NotificationEvent) => {
      const { type, payload } = event;
      const { notification } = payload;

      switch (type) {
        case 'notification:created':
          loggerLoggingManager.getInstance().();
          setNotifications(prev => [notification, ...prev]);
          break;
        case 'notification:updated':
          loggerLoggingManager.getInstance().();
          setNotifications(prev =>
            prev.map(n => (n.id === notification.id ? notification : n))
          );
          break;
        case 'notification:deleted':
          loggerLoggingManager.getInstance().();
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
          break;
      }
    };

    const unsubscribe = on('notification:event', handleNotificationEvent);

    return () => {
      unsubscribe();
    };
  }, [socket, on]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh: fetchNotifications,
  };
}

