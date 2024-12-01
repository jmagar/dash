import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { NotificationEntity, NotificationType, NotificationEvent, ServiceStatus } from '../../../types/notifications';
import { BatchQueue } from './types';
import { io } from '../../server';

export class NotificationBatchService extends EventEmitter {
  private batchQueues: Map<string, BatchQueue> = new Map();

  constructor() {
    super();
    this.processBatchQueues = this.processBatchQueues.bind(this);
    setInterval(this.processBatchQueues, 60000); // Check batch queues every minute
  }

  public addToBatchQueue(userId: string, notification: NotificationEntity): void {
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
    for (const [userId, queue] of this.batchQueues) {
      if (!queue.timer && queue.notifications.length > 0) {
        const timeSinceLastProcess = Date.now() - queue.lastProcessed.getTime();
        if (timeSinceLastProcess >= 300000) { // 5 minutes default
          await this.processBatchQueue(userId);
        }
      }
    }
  }

  private async processBatchQueue(userId: string): Promise<void> {
    const queue = this.batchQueues.get(userId);
    if (!queue) return;

    try {
      const notifications = queue.notifications;
      queue.notifications = [];
      queue.lastProcessed = new Date();

      // Group notifications by type
      const groupedNotifications = notifications.reduce((acc, notification) => {
        const { type } = notification;
        if (!acc[type]) acc[type] = [];
        acc[type].push(notification);
        return acc;
      }, {} as Record<NotificationType, NotificationEntity[]>);

      // Send batched notifications by type
      for (const [type, typeNotifications] of Object.entries(groupedNotifications)) {
        const event: NotificationEvent = {
          type: 'notification:created',
          payload: {
            notification: {
              id: `batch-${Date.now()}`,
              userId,
              type: type as NotificationType,
              title: `${typeNotifications.length} New Notifications`,
              message: typeNotifications.map(n => n.message).join('\n'),
              read: false,
              timestamp: new Date(),
              status: ServiceStatus.Success
            }
          }
        };

        this.emit('notification:event', event);
        io.to(userId).emit('notification:event', event);
      }
    } catch (error) {
      logger.error('Failed to process batch queue', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
    }
  }
}

export const batchService = new NotificationBatchService();
