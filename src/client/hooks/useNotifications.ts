import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { notificationsClient } from '../api/notifications.client';
import type {
  Notification,
  NotificationCount,
  NotificationPreferences,
  NotificationType,
} from '../../types/notifications';

interface UseNotificationsOptions {
  userId: string;
  limit?: number;
  autoRefresh?: boolean;
}

interface NotificationEvent {
  notificationIds: string[];
  read: boolean;
}

export function useNotifications({ userId, limit = 10, autoRefresh = true }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const result = await notificationsClient.getNotifications({
        userId,
        limit,
      });
      if (result.success && result.data) {
        setNotifications(result.data);
      } else {
        setError(result.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  // Fetch notification counts
  const fetchCounts = useCallback(async () => {
    try {
      const result = await notificationsClient.getNotificationCount(userId);
      if (result.success && result.data) {
        setCounts(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch notification counts:', err);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await notificationsClient.markAsRead(notificationId);
      if (result.success) {
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        ));
        await fetchCounts();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, [fetchCounts]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const result = await notificationsClient.markAllAsRead(unreadIds);
      if (result.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
        await fetchCounts();
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [notifications, fetchCounts]);

  // Delete notifications
  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      const result = await notificationsClient.deleteNotifications(notificationIds);
      if (result.success) {
        setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
        await fetchCounts();
      }
    } catch (err) {
      console.error('Failed to delete notifications:', err);
    }
  }, [fetchCounts]);

  // Handle real-time updates
  useEffect(() => {
    if (!socket || !autoRefresh) return;

    const handleNewNotification = (data: unknown) => {
      const notification = data as Notification;
      if (notification.userId === userId) {
        setNotifications(prev => [notification, ...prev]);
        fetchCounts();
      }
    };

    const handleNotificationsUpdated = (data: unknown) => {
      const event = data as NotificationEvent;
      setNotifications(prev => prev.map(n =>
        event.notificationIds.includes(n.id)
          ? {
              ...n,
              read: event.read,
              readAt: event.read ? new Date() : n.readAt
            } as Notification
          : n
      ));
      fetchCounts();
    };

    const handleNotificationsDeleted = (data: unknown) => {
      const event = data as NotificationEvent;
      setNotifications(prev => prev.filter(n => !event.notificationIds.includes(n.id)));
      fetchCounts();
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notifications:updated', handleNotificationsUpdated);
    socket.on('notifications:deleted', handleNotificationsDeleted);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notifications:updated', handleNotificationsUpdated);
      socket.off('notifications:deleted', handleNotificationsDeleted);
    };
  }, [socket, userId, autoRefresh, fetchCounts]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    fetchCounts();
  }, [fetchNotifications, fetchCounts]);

  return {
    notifications,
    counts,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refresh: fetchNotifications,
  };
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const result = await notificationsClient.getPreferences();
      if (result.success && result.data) {
        setPreferences(result.data);
      } else {
        setError(result.error || 'Failed to fetch notification preferences');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Omit<NotificationPreferences, 'userId'>) => {
    try {
      const result = await notificationsClient.updatePreferences(newPreferences);
      if (result.success) {
        setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refresh: fetchPreferences,
  };
}
