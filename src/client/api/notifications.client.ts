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
import { BaseApiClient, type Endpoint, type EndpointParams } from './base.client';
import { logger } from '../utils/frontendLogger';
import { ServiceOperationError } from '../../types/errors';

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

type NotificationEndpoints = Record<string, Endpoint> & {
  LIST: '/notifications';
  COUNT: '/notifications/count';
  READ: Endpoint;
  READ_ALL: '/notifications/read-all';
  DELETE: '/notifications';
  PREFERENCES: '/notifications/preferences';
  DELIVERY: '/notifications/delivery';
};

const NOTIFICATION_ENDPOINTS: NotificationEndpoints = {
  LIST: '/notifications',
  COUNT: '/notifications/count',
  READ: (...args: EndpointParams[]) => `/notifications/${args[0]}/read`,
  READ_ALL: '/notifications/read-all',
  DELETE: '/notifications',
  PREFERENCES: '/notifications/preferences',
  DELIVERY: '/notifications/delivery',
};

class NotificationsClient extends BaseApiClient<NotificationEndpoints> {
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

      return this.get<NotificationEntity[]>(
        this.getEndpoint('LIST'),
        { params: Object.fromEntries(queryParams) }
      );
    } catch (error) {
      logger.error('Failed to get notifications', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
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
      return this.get<NotificationCount>(
        this.getEndpoint('COUNT'),
        { params: { userId } }
      );
    } catch (error) {
      logger.error('Failed to get notification count', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
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
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : String(error),
        notificationId
      });
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
      logger.error('Failed to mark notifications as read', {
        error: error instanceof Error ? error.message : String(error),
        notificationIds
      });
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
      logger.error('Failed to delete notifications', {
        error: error instanceof Error ? error.message : String(error),
        notificationIds
      });
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
      logger.error('Failed to get notification preferences', {
        error: error instanceof Error ? error.message : String(error)
      });
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
      logger.error('Failed to update notification preferences', {
        error: error instanceof Error ? error.message : String(error),
        preferences
      });
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
      logger.error('Failed to get notification delivery status', {
        error: error instanceof Error ? error.message : String(error),
        notificationId
      });
      throw new ServiceOperationError(
        'Failed to get notification delivery status',
        'getDeliveryStatus',
        { notificationId }
      );
    }
  }
}

export const notificationsClient = new NotificationsClient();
