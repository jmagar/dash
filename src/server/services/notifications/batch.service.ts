import { EventEmitter } from 'events';
import type { NotificationEntity, NotificationEvent } from '../../../types/notifications';
import { ServiceStatus } from '../../../types/status';
import { BatchQueue, NotificationInput } from './types';
import { NotificationDBService } from './db.service';
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger, LogMetadata } from '../../../types/logger';

interface NotificationLogMetadata extends LogMetadata {
  userId: string;
  component: string;
  notification: {
    id: string;
    type: string;
  };
  error?: Error;
  timing?: {
    total?: number;
  };
}

export class NotificationBatchService extends EventEmitter {
  private readonly logger: Logger;
  private batchQueues: Map<string, BatchQueue> = new Map();
  private dbService: NotificationDBService;
  private checkInterval: NodeJS.Timeout;

  constructor(logManager?: LoggingManager) {
    super();
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'NotificationBatchService',
      service: 'NotificationService'
    });

    this.dbService = new NotificationDBService();
    
    // Use arrow function to preserve this context
    this.checkInterval = setInterval(() => {
      void this.processBatchQueues();
    }, 60000); // Check batch queues every minute

    this.logger.info('NotificationBatchService initialized', {
      checkInterval: 60000
    });
  }

  public addToBatchQueue(userId: string, notification: Partial<NotificationEntity>): void {
    const methodLogger = this.logger.withContext({
      operation: 'addToBatchQueue',
      userId
    });

    let queue = this.batchQueues.get(userId);
    if (!queue) {
      queue = {
        notifications: [],
        timer: null,
        lastProcessed: new Date()
      };
      this.batchQueues.set(userId, queue);
      methodLogger.debug('Created new batch queue', { userId });
    }

    if (this.isValidInput(notification)) {
      queue.notifications.push(notification);
      methodLogger.debug('Added notification to batch queue', {
        userId,
        queueSize: queue.notifications.length,
        notificationType: notification.type
      });
    } else {
      methodLogger.warn('Invalid notification input', {
        userId,
        notification: {
          id: notification.id,
          type: notification.type
        }
      });
    }
  }

  private async processBatchQueues(): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'processBatchQueues',
      component: 'NotificationBatchService'
    });

    try {
      methodLogger.debug('Starting batch queue processing');
      const entries = Array.from(this.batchQueues.entries());
      
      for (const [userId, queue] of entries) {
        if (!queue.timer && queue.notifications.length > 0) {
          const timeSinceLastProcess = Date.now() - queue.lastProcessed.getTime();
          if (timeSinceLastProcess >= 300000) { // 5 minutes default
            await this.processBatchQueue(userId, queue);
          }
        }
      }

      const duration = Date.now() - startTime;
      methodLogger.debug('Batch queue processing completed', {
        timing: { total: duration },
        queuesProcessed: entries.length
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to process batch queues', metadata);
    }
  }

  private async processBatchQueue(userId: string, queue: BatchQueue): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'processBatchQueue',
      userId,
      component: 'NotificationBatchService'
    });

    try {
      if (!queue.notifications.length) {
        return;
      }

      methodLogger.info('Processing batch queue', {
        userId,
        notificationCount: queue.notifications.length
      });

      const validNotifications: NotificationEntity[] = [];
      const failedNotifications: NotificationInput[] = [];
      const queueLength = queue.notifications.length;
      const notificationsToProcess = Array.from(queue.notifications);

      // Clear the queue before processing
      queue.notifications = [];
      queue.lastProcessed = new Date();

      // Process each notification
      for (const notification of notificationsToProcess) {
        // Ensure notification is valid before processing
        if (!this.isValidInput(notification)) {
          methodLogger.warn('Invalid notification input', { userId, notification });
          continue; // Skip invalid notifications
        }
        if (!this.isValidNotification(notification)) {
          // Extract properties safely for logging
          const safeNotificationRef = this.getSafeNotificationReference(notification);
          const logMetadata: NotificationLogMetadata = {
            userId,
            component: 'NotificationBatchService',
            notification: {
              id: safeNotificationRef.id,
              type: safeNotificationRef.type
            }
          };
          methodLogger.warn('Invalid notification entity', logMetadata);
          continue; // Skip invalid notifications
        }
        try {
          const validatedNotification = this.validateNotificationInput(notification);
          const dbResult = await this.dbService.create(validatedNotification);
          
          // Validate the database result
          if (this.isValidNotification(dbResult)) {
            validNotifications.push(dbResult);
          } else {
            // Extract properties safely for logging
            const safeNotificationRef = this.getSafeNotificationReference(dbResult);
            const logMetadata: NotificationLogMetadata = {
              userId,
              component: 'NotificationBatchService',
              notification: {
                id: safeNotificationRef.id,
                type: safeNotificationRef.type
              }
            };
            methodLogger.warn('Invalid notification entity', logMetadata);
            
            // Only add to failed notifications if the original input was valid
            if (this.isValidInput(notification)) {
              failedNotifications.push(notification);
            }
          }
        } catch (error) {
          const logMetadata: NotificationLogMetadata = {
            error: error instanceof Error ? error : new Error(String(error)),
            userId,
            component: 'NotificationBatchService',
            notification: {
              id: this.ensureString(notification?.id),
              type: this.ensureString(notification?.type)
            },
            timing: { total: Date.now() - startTime }
          };
          methodLogger.error('Failed to create notification', logMetadata);
          if (this.isValidInput(notification)) {
            failedNotifications.push(notification);
          }
        }
      }

      if (validNotifications.length > 0) {
        const event: NotificationEvent = {
          type: 'notification:bulk_updated',
          payload: { 
            notifications: validNotifications,
            changes: { batched: true }
          },
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          serviceName: 'notifications'
        };

        // Emit event through EventEmitter instead of direct socket usage
        this.emit('notifications:bulk_updated', userId, event);
        methodLogger.info('Emitted bulk notification event', {
          userId,
          notificationCount: validNotifications.length
        });
      }

      if (failedNotifications.length > 0) {
        methodLogger.warn('Some notifications failed processing', {
          userId,
          failedCount: failedNotifications.length,
          totalCount: queueLength
        });
      }

      const duration = Date.now() - startTime;
      methodLogger.info('Batch queue processing completed', {
        userId,
        timing: { total: duration },
        stats: {
          total: queueLength,
          succeeded: validNotifications.length,
          failed: failedNotifications.length
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: NotificationLogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        userId,
        component: 'NotificationBatchService',
        notification: this.getSafeNotificationReference({ id: 'unknown', type: 'unknown' }),
        timing: { total: duration }
      };
      methodLogger.error('Failed to process batch queue', metadata);
    }
  }

  private getSafeNotificationReference(notification: unknown): { id: string; type: string } {
    if (notification && typeof notification === 'object') {
      const notifObj = notification as { id?: unknown; type?: unknown };
      return {
        id: this.ensureString(notifObj.id),
        type: this.ensureString(notifObj.type)
      };
    }
    return { id: 'unknown', type: 'unknown' };
  }

  private ensureString(value: unknown): string {
    return typeof value === 'string' ? value : 'unknown';
  }

  private isValidInput(notification: Partial<NotificationEntity>): notification is NotificationInput {
    return notification !== null &&
           typeof notification === 'object' &&
           typeof notification.id === 'string' &&
           typeof notification.userId === 'string' &&
           typeof notification.type === 'string';
  }

  private validateNotificationInput(notification: NotificationInput): NotificationEntity {
    if (!notification.title || typeof notification.title !== 'string') {
      throw new Error('Invalid notification: missing or invalid title');
    }
    if (!notification.message || typeof notification.message !== 'string') {
      throw new Error('Invalid notification: missing or invalid message');
    }
    if (!notification.channel || typeof notification.channel !== 'string') {
      throw new Error('Invalid notification: missing or invalid channel');
    }

    const now = new Date();
    const validatedNotification: NotificationEntity = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channel: notification.channel,
      read: notification.read ?? false,
      timestamp: notification.timestamp ?? now,
      status: notification.status ?? ServiceStatus.PENDING,
      metadata: notification.metadata ?? {},
      alert: notification.alert,
      link: notification.link,
      readAt: notification.readAt,
      createdAt: notification.createdAt ?? now,
      updatedAt: notification.updatedAt ?? now
    };

    return validatedNotification;
  }

  private isValidNotification(notification: unknown): notification is NotificationEntity {
    const methodLogger = this.logger.withContext({
      operation: 'isValidNotification',
      component: 'NotificationBatchService'
    });

    if (!notification || typeof notification !== 'object') {
      methodLogger.debug('Invalid notification: not an object');
      return false;
    }

    const notif = notification as Record<string, unknown>;
    const validations = {
      hasId: typeof notif.id === 'string',
      hasUserId: typeof notif.userId === 'string',
      hasType: typeof notif.type === 'string',
      hasTitle: typeof notif.title === 'string',
      hasMessage: typeof notif.message === 'string',
      hasChannel: typeof notif.channel === 'string',
      hasRead: typeof notif.read === 'boolean',
      hasTimestamp: notif.timestamp instanceof Date,
      hasStatus: typeof notif.status === 'string',
      hasCreatedAt: notif.createdAt instanceof Date,
      hasUpdatedAt: notif.updatedAt instanceof Date
    };

    const isValid = Object.values(validations).every(Boolean);

    if (!isValid) {
      methodLogger.debug('Invalid notification structure', { validation: validations });
    }

    return isValid;
  }

  public cleanup(): void {
    clearInterval(this.checkInterval);
    this.batchQueues.clear();
    this.logger.info('NotificationBatchService cleaned up');
  }
}

// Export a factory function instead of instance
export const createBatchService = (logManager?: LoggingManager): NotificationBatchService => {
  return new NotificationBatchService(logManager);
};
