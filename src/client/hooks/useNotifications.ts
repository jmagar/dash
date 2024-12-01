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
      logger.error('Failed to fetch notifications', {
        error: error instanceof Error ? error : undefined,
        userId,
        limit,
        type,
      });
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
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error : undefined,
        notificationId,
      });
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
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error : undefined,
        userId,
      });
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
      logger.error('Failed to clear notifications', {
        error: error instanceof Error ? error : undefined,
        userId,
      });
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
          logger.debug('New notification received', { notification });
          setNotifications(prev => [notification, ...prev]);
          break;
        case 'notification:updated':
          logger.debug('Notification updated', { notification });
          setNotifications(prev =>
            prev.map(n => (n.id === notification.id ? notification : n))
          );
          break;
        case 'notification:deleted':
          logger.debug('Notification deleted', { notificationId: notification.id });
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
