import { BaseApiClient, type Endpoint, type EndpointParams, type EndpointFunction } from './base.client';
import type { NotificationEntity } from '../../types/notifications';
import type { ApiResponse } from '../../types/express';

type NotificationsEndpoints = Record<string, Endpoint> & {
  GET: '/api/notifications';
  MARK_READ: EndpointFunction;
  MARK_ALL_READ: '/api/notifications/mark-all-read';
  CLEAR: '/api/notifications/clear';
};

const NOTIFICATIONS_ENDPOINTS: NotificationsEndpoints = {
  GET: '/api/notifications',
  MARK_READ: (...args: EndpointParams[]) => `/api/notifications/${args[0]}/mark-read`,
  MARK_ALL_READ: '/api/notifications/mark-all-read',
  CLEAR: '/api/notifications/clear'
};

class NotificationsApiClient extends BaseApiClient<NotificationsEndpoints> {
  constructor() {
    super(NOTIFICATIONS_ENDPOINTS);
  }

  async getNotifications(filter?: string): Promise<ApiResponse<NotificationEntity[]>> {
    const params = filter ? { filter } : undefined;
    return this.get(this.getEndpoint('GET'), { params });
  }

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    return this.post(this.getEndpoint('MARK_READ', id));
  }

  async markAllAsRead(ids: string[]): Promise<ApiResponse<void>> {
    return this.post(this.getEndpoint('MARK_ALL_READ'), { ids });
  }

  async clearNotifications(userId: string): Promise<ApiResponse<void>> {
    return this.post(this.getEndpoint('CLEAR'), { userId });
  }
}

export const notificationsApi = new NotificationsApiClient();
