import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { NotificationEntity, NotificationType, NotificationEvent, NotificationChannel } from '../../../types/notifications';
import { ServiceStatus } from '../../../types/status';
import { BatchQueue } from './types';
import { io } from '../../socket';
import { NotificationDBService } from './db.service';
import { LoggingManager } from '../../managers/utils/LoggingManager';

export class NotificationBatchService extends EventEmitter {
  private batchQueues: Map<string, BatchQueue> = new Map();
  private dbService: NotificationDBService;

  constructor() {
    super();
    this.dbService = new NotificationDBService();
    this.processBatchQueues = this.processBatchQueues.bind(this);
    setInterval(this.processBatchQueues, 60000); // Check batch queues every minute
  }

  public addToBatchQueue(userId: string, notification: Partial<NotificationEntity>): void {
    let queue = this.batchQueues.get(userId);
    if (!queue) {
      queue = {
        notifications: [],
        timer: null,
        lastProcessed: new Date()
      };
      this.batchQueues.set(userId, queue);
    }
    queue.notifications.push(notification);
  }

  private async processBatchQueues(): Promise<void> {
    // Convert Map entries to array for ES5 compatibility
    const entries = Array.from(this.batchQueues.entries());
    for (const [userId, queue] of entries) {
      if (!queue.timer && queue.notifications.length > 0) {
        const timeSinceLastProcess = Date.now() - queue.lastProcessed.getTime();
        if (timeSinceLastProcess >= 300000) { // 5 minutes default
          await this.processBatchQueue(userId, queue);
        }
      }
    }
  }

  private async processBatchQueue(userId: string, queue: BatchQueue): Promise<void> {
    try {
      if (!queue.notifications.length) {
        return;
      }

      const notifications = queue.notifications;
      queue.notifications = [];
      queue.lastProcessed = new Date();

      const validNotifications: NotificationEntity[] = [];
      const failedNotifications: Partial<NotificationEntity>[] = [];

      for (const notification of notifications) {
        try {
          const entity = await this.dbService.create(notification as NotificationEntity);
          if (!this.isValidNotification(entity)) {
            loggerLoggingManager.getInstance().();
            failedNotifications.push(notification);
            continue;
          }
          validNotifications.push(entity);
        } catch (error) {
          loggerLoggingManager.getInstance().();
          failedNotifications.push(notification);
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

        io.to(`user:${userId}`).emit('notification', event);
      }

      if (failedNotifications.length > 0) {
        loggerLoggingManager.getInstance().();
      }
    } catch (error) {
      loggerLoggingManager.getInstance().();
    }
  }

  private isValidNotification(notification: any): notification is NotificationEntity {
    return notification 
      && typeof notification === 'object'
      && typeof notification.id === 'string'
      && typeof notification.userId === 'string'
      && typeof notification.type === 'string'
      && typeof notification.timestamp === 'object'
      && notification.timestamp instanceof Date;
  }
}

export const batchService = new NotificationBatchService();


