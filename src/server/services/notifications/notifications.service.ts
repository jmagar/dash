import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { Server as SocketIOServer } from 'socket.io';
import { ApiError } from '../../../types/error';
import { ServiceStatus } from '../../../types/status';
import { 
  NotificationEntity, 
  NotificationType,
  NotificationEvent,
  NotificationPreferences,
  NotificationChannel,
  isNotificationEntity,
  isNotificationType,
  isNotificationChannel,
  isNotificationPreferences,
  isPartialNotificationPreferences
} from '../../../types/notifications';
import { batchService } from './batch.service';
import { deliveryService } from './delivery.service';
import { notificationDBService } from './db.service';
import { preferencesService } from './preferences.service';
import { LoggingManager } from '../../managers/utils/LoggingManager';

export class NotificationsService extends EventEmitter {
  private socketIO: SocketIOServer | null = null;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  public initializeSocketIO(socketIO: SocketIOServer): void {
    this.socketIO = socketIO;
  }

  private setupEventHandlers(): void {
    // Setup event handlers if needed
  }

  private emitNotificationEvent(event: NotificationEvent, userId: string): void {
    if (!this.socketIO) {
      LoggingManager.getInstance().error('SocketIO instance not initialized');
      return;
    }

    try {
      this.socketIO.to(`user:${userId}`).emit('notification', {
        ...event,
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        serviceName: 'notifications'
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to emit notification event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
    }
  }

  private async updateNotificationCountsCache(userId: string): Promise<void> {
    try {
      const counts = await notificationDBService.getNotificationCounts(userId);
      // Cache update logic here
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update notification counts cache', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
    }
  }

  private createNotificationEntity(notification: Partial<NotificationEntity>): NotificationEntity {
    if (!notification.userId || !notification.type || !notification.title || !notification.message) {
      throw new ApiError('Missing required notification fields', 400);
    }

    if (!isNotificationType(notification.type)) {
      throw new ApiError('Invalid notification type', 400);
    }

    return {
      id: `notification-${Date.now()}`,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || {},
      channel: notification.channel || 'web',
      read: false,
      status: ServiceStatus.SENT,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private convertToNotification(entity: NotificationEntity): NotificationEntity {
    if (!isNotificationEntity(entity)) {
      LoggingManager.getInstance().error('Invalid notification entity', {
        entity,
        error: 'Entity validation failed'
      });
      throw new ApiError('Invalid notification entity', 500);
    }
    return entity;
  }

  public async create(options: { 
    userId: string; 
    title: string; 
    message: string; 
    type: NotificationType; 
    metadata?: Record<string, unknown>; 
    batch?: boolean 
  }): Promise<NotificationEntity> {
    try {
      const { userId, title, message, type, metadata, batch } = options;

      if (!userId || !title || !message || !type) {
        throw new ApiError('Missing required notification fields', 400);
      }

      if (!isNotificationType(type)) {
        throw new ApiError('Invalid notification type', 400);
      }

      const notification: Partial<NotificationEntity> = {
        userId,
        type,
        title,
        message,
        metadata: metadata || {},
        channel: NotificationChannel.Web,
        read: false,
        status: ServiceStatus.SENT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const preferences = await preferencesService.getPreferences(userId);
      if (!preferences) {
        throw new ApiError('User preferences not found', 404);
      }

      if (batch && preferences.globalConfig?.batchNotifications) {
        try {
          batchService.addToBatchQueue(userId, notification);
          return {
            ...notification,
            id: `batch-${Date.now()}`
          } as NotificationEntity;
        } catch (error) {
          LoggingManager.getInstance().error('Failed to batch notification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId
          });
          throw new ApiError('Failed to batch notification', 500);
        }
      }

      const notificationEntity = this.createNotificationEntity(notification);
      const savedEntity = await notificationDBService.create(notificationEntity);

      if (!isNotificationEntity(savedEntity)) {
        LoggingManager.getInstance().error('Invalid notification data returned from database', {
          entity: savedEntity,
          error: 'Entity validation failed'
        });
        throw new ApiError('Invalid notification data returned from database', 500);
      }

      try {
        await deliveryService.deliverNotification({
          userId,
          notification: savedEntity,
          preferences
        });
      } catch (error) {
        LoggingManager.getInstance().error('Failed to deliver notification', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        });
      }

      const event: NotificationEvent = {
        type: 'notification:created',
        payload: { notification: savedEntity },
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        serviceName: 'notifications'
      };

      this.emitNotificationEvent(event, userId);

      return savedEntity;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to create notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to create notification', 500);
    }
  }

  public async markAsRead(notificationId: string): Promise<void> {
    try {
      if (!notificationId) {
        throw new ApiError('Notification ID is required', 400);
      }

      const existingNotification = await notificationDBService.getById(notificationId);
      if (!existingNotification || !isNotificationEntity(existingNotification)) {
        LoggingManager.getInstance().error('Invalid notification entity', {
          entity: existingNotification,
          error: 'Entity validation failed'
        });
        throw new ApiError('Notification not found', 404);
      }

      const updatedEntity = await notificationDBService.markAsRead(notificationId);
      if (!isNotificationEntity(updatedEntity)) {
        LoggingManager.getInstance().error('Invalid notification data returned from database', {
          entity: updatedEntity,
          error: 'Entity validation failed'
        });
        throw new ApiError('Invalid notification data returned from database', 500);
      }

      const event: NotificationEvent = {
        type: 'notification:updated',
        payload: { 
          notification: updatedEntity,
          changes: { read: true }
        },
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        serviceName: 'notifications'
      };

      this.emitNotificationEvent(event, updatedEntity.userId);

      try {
        await this.updateNotificationCountsCache(updatedEntity.userId);
      } catch (error) {
        LoggingManager.getInstance().error('Failed to update notification counts cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: updatedEntity.userId
        });
      }
    } catch (error) {
      LoggingManager.getInstance().error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to mark notification as read', 500);
    }
  }

  public async markAllAsRead(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new ApiError('User ID is required', 400);
      }

      const existingNotifications = await notificationDBService.getByUserId(userId, { read: false });
      if (!existingNotifications || existingNotifications.length === 0) {
        return;
      }

      const updatedEntities = await notificationDBService.markAllAsRead(userId);
      if (!Array.isArray(updatedEntities)) {
        LoggingManager.getInstance().error('Invalid response from database', {
          error: 'Invalid response format'
        });
        throw new ApiError('Invalid response from database', 500);
      }
      
      const validEntities: NotificationEntity[] = [];
      for (const entity of updatedEntities) {
        if (!isNotificationEntity(entity)) {
          LoggingManager.getInstance().error('Invalid notification entity', {
            entity,
            error: 'Entity validation failed'
          });
          continue;
        }
        validEntities.push(entity);

        const event: NotificationEvent = {
          type: 'notification:updated',
          payload: { 
            notification: entity,
            changes: { read: true }
          },
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          serviceName: 'notifications'
        };

        this.emitNotificationEvent(event, userId);
      }

      if (validEntities.length > 0) {
        const bulkEvent: NotificationEvent = {
          type: 'notification:bulk_updated',
          payload: { 
            notifications: validEntities,
            changes: { read: true }
          },
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          serviceName: 'notifications'
        };
        this.emitNotificationEvent(bulkEvent, userId);
      }

      try {
        await this.updateNotificationCountsCache(userId);
      } catch (error) {
        LoggingManager.getInstance().error('Failed to update notification counts cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId
        });
      }
    } catch (error) {
      LoggingManager.getInstance().error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to mark all notifications as read', 500);
    }
  }

  public async delete(notificationId: string): Promise<void> {
    try {
      if (!notificationId) {
        throw new ApiError('Notification ID is required', 400);
      }

      const existingNotification = await notificationDBService.getById(notificationId);
      if (!existingNotification || !isNotificationEntity(existingNotification)) {
        LoggingManager.getInstance().error('Invalid notification entity', {
          entity: existingNotification,
          error: 'Entity validation failed'
        });
        throw new ApiError('Notification not found', 404);
      }

      const deletedEntity = await notificationDBService.delete(notificationId);
      if (!isNotificationEntity(deletedEntity)) {
        LoggingManager.getInstance().error('Invalid notification data returned from database', {
          entity: deletedEntity,
          error: 'Entity validation failed'
        });
        throw new ApiError('Invalid notification data returned from database', 500);
      }

      const event: NotificationEvent = {
        type: 'notification:deleted',
        payload: { 
          notification: deletedEntity,
          action: 'delete'
        },
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        serviceName: 'notifications'
      };

      this.emitNotificationEvent(event, deletedEntity.userId);

      try {
        await this.updateNotificationCountsCache(deletedEntity.userId);
      } catch (error) {
        LoggingManager.getInstance().error('Failed to update notification counts cache', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: deletedEntity.userId
        });
      }
    } catch (error) {
      LoggingManager.getInstance().error('Failed to delete notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to delete notification', 500);
    }
  }

  public async getById(notificationId: string): Promise<NotificationEntity | null> {
    try {
      if (!notificationId) {
        throw new ApiError('Notification ID is required', 400);
      }

      const entity = await notificationDBService.getById(notificationId);
      
      if (!entity) {
        return null;
      }

      if (!isNotificationEntity(entity)) {
        LoggingManager.getInstance().error('Invalid notification entity', {
          entity,
          error: 'Entity validation failed'
        });
        throw new ApiError('Invalid notification data returned from database', 500);
      }

      return this.convertToNotification(entity);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to get notification', 500);
    }
  }

  public async getByUserId(userId: string, filter?: { read?: boolean; type?: NotificationType }): Promise<NotificationEntity[]> {
    if (!userId || typeof userId !== 'string') {
      throw new ApiError('Invalid userId provided', 400);
    }

    try {
      const entities = await notificationDBService.getByUserId(userId, filter);
      
      return entities.map(entity => {
        try {
          if (!isNotificationEntity(entity)) {
            LoggingManager.getInstance().error('Invalid notification entity', {
              entity,
              error: 'Entity validation failed'
            });
            return null;
          }
          return this.convertToNotification(entity);
        } catch (error) {
          LoggingManager.getInstance().error('Failed to convert notification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            entity
          });
          return null;
        }
      }).filter((notification): notification is NotificationEntity => notification !== null);
    } catch (error) {
      LoggingManager.getInstance().error('Failed to fetch notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new ApiError(`Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  public async getNotificationCounts(userId: string): Promise<Record<NotificationType, { total: number; unread: number }>> {
    try {
      if (!userId) {
        throw new ApiError('User ID is required', 400);
      }

      const counts = await notificationDBService.getNotificationCounts(userId);
      
      if (!counts || typeof counts !== 'object') {
        LoggingManager.getInstance().error('Invalid notification counts returned from database', {
          error: 'Invalid response format'
        });
        throw new ApiError('Invalid notification counts returned from database', 500);
      }

      Object.entries(counts).forEach(([type, count]) => {
        if (!isNotificationType(type)) {
          LoggingManager.getInstance().error('Invalid notification type', {
            type,
            error: 'Type validation failed'
          });
        }
        if (!count || typeof count.total !== 'number' || typeof count.unread !== 'number') {
          LoggingManager.getInstance().error('Invalid notification count', {
            count,
            error: 'Count validation failed'
          });
        }
      });

      return counts;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get notification counts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to get notification counts', 500);
    }
  }

  public async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      if (!userId) {
        throw new ApiError('User ID is required', 400);
      }

      const preferences = await preferencesService.getPreferences(userId);
      
      if (!preferences) {
        throw new ApiError('User preferences not found', 404);
      }

      if (!isNotificationPreferences(preferences)) {
        LoggingManager.getInstance().error('Invalid preferences data', {
          preferences,
          error: 'Preferences validation failed'
        });
        throw new ApiError('Invalid preferences data', 500);
      }

      return preferences;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get notification preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to get notification preferences', 500);
    }
  }

  public async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      if (!userId) {
        throw new ApiError('User ID is required', 400);
      }

      if (!preferences || typeof preferences !== 'object') {
        throw new ApiError('Invalid preferences data provided', 400);
      }

      if (!isPartialNotificationPreferences(preferences)) {
        LoggingManager.getInstance().error('Invalid preferences format', {
          preferences,
          error: 'Preferences validation failed'
        });
        throw new ApiError('Invalid preferences format', 400);
      }

      const updatedPreferences = await preferencesService.updatePreferences(userId, preferences);
      
      if (!updatedPreferences || !isNotificationPreferences(updatedPreferences)) {
        LoggingManager.getInstance().error('Invalid preferences data returned after update', {
          preferences: updatedPreferences,
          error: 'Preferences validation failed'
        });
        throw new ApiError('Invalid preferences data returned after update', 500);
      }

      const event: NotificationEvent = {
        type: 'notification:updated',
        payload: { 
          notification: {
            id: `preferences-${Date.now()}`,
            userId,
            type: NotificationType.Info,
            title: 'Notification Preferences Updated',
            message: 'Your notification preferences have been updated',
            metadata: { preferences: updatedPreferences },
            read: false,
            status: ServiceStatus.SENT,
            channel: NotificationChannel.Web,
            timestamp: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        serviceName: 'notifications'
      };

      this.emitNotificationEvent(event, userId);

      return updatedPreferences;
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update notification preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error instanceof ApiError ? error : new ApiError('Failed to update notification preferences', 500);
    }
  }
}

export const notificationsService = new NotificationsService();

