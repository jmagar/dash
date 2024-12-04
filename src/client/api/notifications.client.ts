import type { ApiResult } from '../../types/api-shared';
import type {
  Notification,
  NotificationCount,
  NotificationPreferences,
  NotificationType,
  NotificationEntity,
  NotificationFilter,
  NotificationDelivery,
} from '../../types/notifications';
import { BaseApiClient } from './base.client';
import { logger } from '../utils/frontendLogger';
import { ServiceOperationError } from '../../types/errors';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface GetNotificationsParams {
  userId: string;
  type?: NotificationType;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  filter?: NotificationFilter;
}

const NOTIFICATION_ENDPOINTS = {
  LIST: '/notifications',
  COUNT: '/notifications/count',
  READ: (id: string) => `/notifications/${id}/read`,
  READ_ALL: '/notifications/read-all',
  DELETE: '/notifications',
  PREFERENCES: '/notifications/preferences',
  DELIVERY: '/notifications/delivery',
} as const;

class NotificationsClient extends BaseApiClient {
  constructor() {
    super(NOTIFICATION_ENDPOINTS);
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(params: GetNotificationsParams): Promise<ApiResult<NotificationEntity[]>> {
    try {
      const queryParams = new URLSearchParams({
        userId: params.userId,
        ...(params.type && { type: params.type }),
        ...(params.read !== undefined && { read: String(params.read) }),
        ...(params.startDate && { startDate: params.startDate.toISOString() }),
        ...(params.endDate && { endDate: params.endDate.toISOString() }),
        ...(params.limit && { limit: String(params.limit) }),
        ...(params.offset && { offset: String(params.offset) }),
      });

      return this.get<NotificationEntity[]>(`${this.getEndpoint('LIST')}?${queryParams.toString()}`);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to get notifications',
        'getNotifications',
        { params }
      );
    }
  }

  /**
   * Get notification counts for a user
   */
  async getNotificationCount(userId: string): Promise<ApiResult<NotificationCount>> {
    try {
      return this.get<NotificationCount>(`${this.getEndpoint('COUNT')}?userId=${userId}`);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to get notification count',
        'getNotificationCount',
        { userId }
      );
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResult<void>> {
    try {
      return this.post<void>(this.getEndpoint('READ', notificationId));
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to mark notification as read',
        'markAsRead',
        { notificationId }
      );
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markAllAsRead(notificationIds: string[]): Promise<ApiResult<void>> {
    try {
      return this.post<void>(this.getEndpoint('READ_ALL'), { notificationIds });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to mark notifications as read',
        'markAllAsRead',
        { notificationIds }
      );
    }
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<ApiResult<void>> {
    try {
      return this.delete<void>(this.getEndpoint('DELETE'), { data: { notificationIds } });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to delete notifications',
        'deleteNotifications',
        { notificationIds }
      );
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResult<NotificationPreferences>> {
    try {
      return this.get<NotificationPreferences>(this.getEndpoint('PREFERENCES'));
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to get notification preferences',
        'getPreferences'
      );
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Omit<NotificationPreferences, 'userId'>): Promise<ApiResult<void>> {
    try {
      return this.put<void>(this.getEndpoint('PREFERENCES'), preferences);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to update notification preferences',
        'updatePreferences',
        { preferences }
      );
    }
  }

  /**
   * Get notification delivery status
   */
  async getDeliveryStatus(notificationId: string): Promise<ApiResult<NotificationDelivery[]>> {
    try {
      return this.get<NotificationDelivery[]>(`${this.getEndpoint('DELIVERY')}/${notificationId}`);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ServiceOperationError(
        'Failed to get notification delivery status',
        'getDeliveryStatus',
        { notificationId }
      );
    }
  }
}

export const notificationsClient = new NotificationsClient();

