import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
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

export function useNotifications({ userId, limit = 50 }: UseNotificationsOptions): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/notifications?userId=${userId}&limit=${limit}`);
      const data = await response.json();

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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
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

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
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

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to clear notifications');
      }

      setNotifications([]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to clear notifications';
      logger.error('Failed to clear notifications:', { error: errorMsg, userId });
      setError(errorMsg);
      throw error;
    }
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:created', (notification: Notification) => {
      if (notification.userId === userId) {
        setNotifications(prev => [notification, ...prev].slice(0, limit));
      }
    });

    socket.on('notification:updated', (notification: Notification) => {
      if (notification.userId === userId) {
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? notification : n))
        );
      }
    });

    socket.on('notification:deleted', (notificationId: string) => {
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
    });

    return () => {
      socket.off('notification:created');
      socket.off('notification:updated');
      socket.off('notification:deleted');
    };
  }, [socket, userId, limit]);

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
