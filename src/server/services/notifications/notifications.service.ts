import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { io } from '../../server';
import { ApiError } from '../../../types/error';
import { 
  NotificationEntity, 
  NotificationOptions,
  NotificationType,
  NotificationFilter,
  NotificationEvent,
  ServiceStatus,
  NotificationPreferences
} from '../../../types/notifications';
import { batchService } from './batch.service';
import { deliveryService } from './delivery.service';
import { preferencesService } from './preferences.service';
import { notificationDBService } from './db.service';
import { validateNotificationPreferences, validatePartialNotificationPreferences } from '../../validators/notification-preferences.validator';

export class NotificationsService extends EventEmitter {
  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    batchService.on('notification:event', (event) => {
      this.emit('notification:event', event);
    });
  }

  public async create(options: NotificationOptions & { userId: string }): Promise<NotificationEntity> {
    try {
      const { userId, title, message, type, data, batch } = options;

      const notification: NotificationEntity = {
        id: `notification-${Date.now()}`,
        userId,
        type,
        title,
        message,
        metadata: data,
        read: false,
        timestamp: new Date(),
        status: ServiceStatus.Success
      };

      // Get user preferences
      const preferences = await preferencesService.getPreferences(userId);

      // Handle batch notifications
      if (batch && preferences.globalConfig?.batchNotifications) {
        batchService.addToBatchQueue(userId, notification);
        return notification;
      }

      // Save notification to database
      const savedNotification = await notificationDBService.create(notification);

      // Deliver notification through configured channels
      await deliveryService.deliverNotification({
        userId,
        notification: savedNotification,
        preferences
      });

      const event: NotificationEvent = {
        type: 'notification:created',
        payload: { notification: savedNotification }
      };

      this.emit('notification:event', event);
      io.to(userId).emit('notification:event', event);

      return savedNotification;
    } catch (error) {
      logger.error('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: options.userId,
        type: options.type
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to create notification', 500);
    }
  }

  public async markAsRead(notificationId: string): Promise<void> {
    try {
      const updatedNotification = await notificationDBService.markAsRead(notificationId);
      
      const event: NotificationEvent = {
        type: 'notification:updated',
        payload: { notification: updatedNotification }
      };

      this.emit('notification:event', event);
      io.to(updatedNotification.userId).emit('notification:event', event);
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId
      });
      throw error;
    }
  }

  public async markAllAsRead(userId: string): Promise<void> {
    try {
      const updatedNotifications = await notificationDBService.markAllAsRead(userId);
      
      for (const notification of updatedNotifications) {
        const event: NotificationEvent = {
          type: 'notification:updated',
          payload: { notification }
        };

        this.emit('notification:event', event);
        io.to(userId).emit('notification:event', event);
      }
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  public async delete(notificationId: string): Promise<void> {
    try {
      const deletedNotification = await notificationDBService.delete(notificationId);

      const event: NotificationEvent = {
        type: 'notification:deleted',
        payload: { notification: deletedNotification }
      };

      this.emit('notification:event', event);
      io.to(deletedNotification.userId).emit('notification:event', event);
    } catch (error) {
      logger.error('Failed to delete notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId
      });
      throw error;
    }
  }

  public async getById(notificationId: string): Promise<NotificationEntity | null> {
    return notificationDBService.getById(notificationId);
  }

  public async getByUserId(userId: string, filter?: NotificationFilter): Promise<NotificationEntity[]> {
    return notificationDBService.getByUserId(userId, filter);
  }

  public async getNotificationCounts(userId: string): Promise<Record<NotificationType, { total: number; unread: number }>> {
    return notificationDBService.getNotificationCounts(userId);
  }

  public async getPreferences(userId: string) {
    return preferencesService.getPreferences(userId);
  }

  public async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    return preferencesService.updatePreferences(userId, preferences);
  }
}

export const notificationsService = new NotificationsService();
