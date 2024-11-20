import type { ApiResult } from '../../types/api-shared';
import type {
  Notification,
  NotificationCount,
  NotificationPreferences,
  NotificationType,
} from '../../types/notifications';
import { BaseApiClient } from './base.client';

interface GetNotificationsParams {
  userId: string;
  type?: NotificationType;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

const NOTIFICATION_ENDPOINTS = {
  LIST: '/notifications',
  COUNT: '/notifications/count',
  READ: (id: string) => `/notifications/${id}/read`,
  READ_ALL: '/notifications/read-all',
  DELETE: '/notifications',
  PREFERENCES: '/notifications/preferences',
} as const;

class NotificationsClient extends BaseApiClient {
  constructor() {
    super(NOTIFICATION_ENDPOINTS);
  }

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

    return this.get<Notification[]>(`${this.getEndpoint('LIST')}?${queryParams.toString()}`);
  }

  /**
   * Get notification counts for a user
   */
  async getNotificationCount(userId: string): Promise<ApiResult<NotificationCount>> {
    return this.get<NotificationCount>(`${this.getEndpoint('COUNT')}?userId=${userId}`);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResult<void>> {
    return this.post<void>(this.getEndpoint('READ', notificationId));
  }

  /**
   * Mark multiple notifications as read
   */
  async markAllAsRead(notificationIds: string[]): Promise<ApiResult<void>> {
    return this.post<void>(this.getEndpoint('READ_ALL'), { notificationIds });
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<ApiResult<void>> {
    return this.delete<void>(this.getEndpoint('DELETE'), { data: { notificationIds } });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResult<NotificationPreferences>> {
    return this.get<NotificationPreferences>(this.getEndpoint('PREFERENCES'));
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Omit<NotificationPreferences, 'userId'>): Promise<ApiResult<void>> {
    return this.put<void>(this.getEndpoint('PREFERENCES'), preferences);
  }
}

export const notificationsClient = new NotificationsClient();
