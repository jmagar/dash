import type { ApiResult } from '../../types/api-shared';
import type {
  Notification,
  NotificationCount,
  NotificationPreferences,
  NotificationType,
} from '../../types/notifications';
import { api } from './api';

interface GetNotificationsParams {
  userId: string;
  type?: NotificationType;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class NotificationsClient {
  /**
   * Get notifications for a user
   */
  async getNotifications(params: GetNotificationsParams): Promise<ApiResult<Notification[]>> {
    const queryParams = new URLSearchParams({
      userId: params.userId,
      ...(params.type && { type: params.type }),
      ...(params.read !== undefined && { read: String(params.read) }),
      ...(params.startDate && { startDate: params.startDate.toISOString() }),
      ...(params.endDate && { endDate: params.endDate.toISOString() }),
      ...(params.limit && { limit: String(params.limit) }),
      ...(params.offset && { offset: String(params.offset) }),
    });

    return api.get(`/notifications?${queryParams.toString()}`);
  }

  /**
   * Get notification counts for a user
   */
  async getNotificationCount(userId: string): Promise<ApiResult<NotificationCount>> {
    return api.get(`/notifications/count?userId=${userId}`);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResult<void>> {
    return api.post(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark multiple notifications as read
   */
  async markAllAsRead(notificationIds: string[]): Promise<ApiResult<void>> {
    return api.post('/notifications/read-all', { notificationIds });
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<ApiResult<void>> {
    return api.delete('/notifications', { data: { notificationIds } });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResult<NotificationPreferences>> {
    return api.get('/notifications/preferences');
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Omit<NotificationPreferences, 'userId'>): Promise<ApiResult<void>> {
    return api.put('/notifications/preferences', preferences);
  }
}

export const notificationsClient = new NotificationsClient();
