import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/frontendLogger';
import { useSocket } from './useSocket';
import type { Notification } from '../../types/notifications';

interface UseNotificationsOptions {
  userId: string;
  limit?: number;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useNotifications({ userId, limit = 50 }: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, on } = useSocket({
    autoReconnect: true,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/notifications?userId=${userId}&limit=${limit}`);
      const data: { success: boolean; data?: Notification[]; error?: string } = await response.json();

      if (data.success && data.data) {
        setNotifications(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch notifications';
      logger.error('Failed to fetch notifications:', { error: errorMsg, userId });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      const data: { success: boolean; error?: string } = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
      } else {
        throw new Error(data.error || 'Failed to mark notification as read');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark notification as read';
      logger.error('Failed to mark notification as read:', { error: errorMsg, notificationId });
      setError(errorMsg);
      throw error;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data: { success: boolean; error?: string } = await response.json();
      if (data.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
      } else {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
      logger.error('Failed to mark all notifications as read:', { error: errorMsg, userId });
      setError(errorMsg);
      throw error;
    }
  }, [userId]);

  const clearNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/notifications`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data: { success: boolean; error?: string } = await response.json();
      if (data.success) {
        setNotifications([]);
      } else {
        throw new Error(data.error || 'Failed to clear notifications');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to clear notifications';
      logger.error('Failed to clear notifications:', { error: errorMsg, userId });
      setError(errorMsg);
      throw error;
    }
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    const handleNotificationCreated = (notification: Notification) => {
      setNotifications(prev => [...prev, notification]);
    };

    const handleNotificationUpdated = (notification: Notification) => {
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? notification : n))
      );
    };

    const handleNotificationDeleted = (notificationId: string) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    const unsubCreated = on('notification:created', handleNotificationCreated);
    const unsubUpdated = on('notification:updated', handleNotificationUpdated);
    const unsubDeleted = on('notification:deleted', handleNotificationDeleted);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [socket, on]);

  useEffect(() => {
    fetchNotifications();
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
