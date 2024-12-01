import { ApiResult } from './types';
import { NotificationEntity, NotificationFilter, NotificationPreferences } from '../../types/notifications';
import { BaseApi } from './base';

const NOTIFICATION_ENDPOINTS = {
  GET: '/notifications',
  READ: '/notifications/:id/read',
  READ_ALL: '/notifications/read-all',
  DELETE: '/notifications',
  PREFERENCES: '/notifications/preferences',
} as const;

export class NotificationsApi extends BaseApi {
  constructor() {
    super(NOTIFICATION_ENDPOINTS);
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(filter: NotificationFilter): Promise<ApiResult<NotificationEntity[]>> {
    const queryParams = new URLSearchParams();
    if (filter.userId) queryParams.append('userId', filter.userId);
    if (filter.type) queryParams.append('type', filter.type.join(','));
    if (filter.read !== undefined) queryParams.append('read', String(filter.read));
    if (filter.startDate) queryParams.append('startDate', filter.startDate.toISOString());
    if (filter.endDate) queryParams.append('endDate', filter.endDate.toISOString());
    if (filter.status) queryParams.append('status', filter.status.join(','));
    if (filter.limit) queryParams.append('limit', String(filter.limit));
    if (filter.offset) queryParams.append('offset', String(filter.offset));

    return this.get<NotificationEntity[]>(this.getEndpoint('GET', undefined, queryParams));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResult<void>> {
    return this.post<void>(this.getEndpoint('READ', notificationId));
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(notificationIds: string[]): Promise<ApiResult<void>> {
    return this.put<void>(this.getEndpoint('READ_ALL'), { ids: notificationIds });
  }

  /**
   * Clear notifications for a user
   */
  async clearNotifications(userId: string): Promise<ApiResult<void>> {
    return this.delete<void>(this.getEndpoint('DELETE'), { userId });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<ApiResult<NotificationPreferences>> {
    return this.get<NotificationPreferences>(this.getEndpoint('PREFERENCES', userId));
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResult<NotificationPreferences>> {
    return this.put<NotificationPreferences>(this.getEndpoint('PREFERENCES', userId), preferences);
  }
}

export const notificationsApi = new NotificationsApi();
