import { EventEmitter } from 'events';
import axios from 'axios';
import { db } from '../db';
import config from '../config';
import { logger } from '../utils/logger';
import { io } from '../server';
import type { Alert } from '../../types/metrics-alerts';
import type {
  Notification,
  NotificationType,
  NotificationPreferences,
  NotificationFilter,
  NotificationCount,
  DBNotification,
  NotificationGotifyEvent,
} from '../../types/notifications';

interface NotificationCountRow {
  type: NotificationType;
  total: string;
  unread: string;
}

class NotificationsService extends EventEmitter {
  private readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    userId: '',
    web: [],
    gotify: [],
    desktop: [],
    muted: false,
    webEnabled: true,
    gotifyEnabled: true,
    desktopEnabled: true,
    alertTypes: {
      alert: true,
      info: true,
      success: true,
      warning: true,
      error: true,
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  private readonly GOTIFY_PRIORITIES: Record<NotificationType, number> = {
    error: 8,
    alert: 7,
    warning: 5,
    info: 3,
    success: 3,
  };

  private readonly gotifyUrl: string | undefined;
  private readonly gotifyToken: string | undefined;

  constructor() {
    super();
    this.gotifyUrl = config.gotify?.url;
    this.gotifyToken = config.gotify?.token;
  }

  /**
   * Convert Alert to database format
   */
  private alertToRecord(alert?: Alert): Record<string, unknown> | undefined {
    if (!alert) return undefined;
    return {
      id: alert.id,
      hostId: alert.hostId,
      category: alert.category,
      severity: alert.severity,
      status: alert.status,
      title: alert.title,
      message: alert.message,
      source: alert.source,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      metadata: alert.metadata,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      acknowledgedBy: alert.acknowledgedBy,
      resolvedAt: alert.resolvedAt?.toISOString(),
      resolvedBy: alert.resolvedBy,
    };
  }

  /**
   * Convert database record back to Alert
   */
  private recordToAlert(record?: Record<string, unknown>): Alert | undefined {
    if (!record) return undefined;
    return {
      id: record.id as string,
      hostId: record.hostId as string,
      category: record.category as Alert['category'],
      severity: record.severity as Alert['severity'],
      status: record.status as Alert['status'],
      title: record.title as string,
      message: record.message as string,
      source: record.source as string,
      metric: record.metric as string | undefined,
      value: record.value as number | undefined,
      threshold: record.threshold as number | undefined,
      metadata: record.metadata as Record<string, unknown> | undefined,
      createdAt: new Date(record.createdAt as string),
      updatedAt: new Date(record.updatedAt as string),
      acknowledgedAt: record.acknowledgedAt ? new Date(record.acknowledgedAt as string) : undefined,
      acknowledgedBy: record.acknowledgedBy as string | undefined,
      resolvedAt: record.resolvedAt ? new Date(record.resolvedAt as string) : undefined,
      resolvedBy: record.resolvedBy as string | undefined,
    };
  }

  /**
   * Send notification to Gotify
   */
  private async sendGotifyNotification(event: NotificationGotifyEvent): Promise<boolean> {
    if (!this.gotifyUrl || !this.gotifyToken) {
      return false;
    }

    try {
      const url = `${this.gotifyUrl.replace(/\/$/, '')}/message`;
      const message = {
        title: event.title,
        message: event.message,
        priority: event.priority,
        extras: event.link ? {
          'client::notification': {
            click: {
              url: event.link,
            },
          },
        } : undefined,
      };

      await axios.post(url, message, {
        headers: {
          'X-Gotify-Key': this.gotifyToken,
        },
      });

      return true;
    } catch (error) {
      logger.error('Failed to send Gotify notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: event.title,
      });
      return false;
    }
  }

  /**
   * Create a notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: {
      metadata?: Record<string, unknown>;
      alert?: Alert;
      link?: string;
    } = {}
  ): Promise<Notification> {
    try {
      const now = new Date();
      const dbNotification: DBNotification = {
        id: crypto.randomUUID(),
        user_id: userId,
        type,
        title,
        message,
        metadata: options.metadata,
        alert: this.alertToRecord(options.alert),
        link: options.link,
        read: false,
        created_at: now
      };

      const result = await db.query<DBNotification>(
        `INSERT INTO notifications (
          id, user_id, type, title, message, metadata, alert, link, read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          dbNotification.id,
          dbNotification.user_id,
          dbNotification.type,
          dbNotification.title,
          dbNotification.message,
          dbNotification.metadata,
          dbNotification.alert,
          dbNotification.link,
          dbNotification.read,
          dbNotification.created_at
        ]
      );

      const created = this.dbToNotification(result.rows[0]);

      // Send real-time notification
      await this.sendNotification(created);

      return created;
    } catch (error) {
      logger.error('Failed to create notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type,
      });
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(filter: NotificationFilter): Promise<Notification[]> {
    try {
      const conditions: string[] = ['user_id = $1'];
      const params: unknown[] = [filter.userId];
      let paramIndex = 2;

      if (filter.type) {
        conditions.push(`type = ANY($${paramIndex})`);
        params.push(filter.type);
        paramIndex++;
      }

      if (typeof filter.read === 'boolean') {
        conditions.push(`read = $${paramIndex}`);
        params.push(filter.read);
        paramIndex++;
      }

      if (filter.startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filter.startDate);
        paramIndex++;
      }

      if (filter.endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filter.endDate);
        paramIndex++;
      }

      let query = `
        SELECT * FROM notifications
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
      `;

      if (filter.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filter.limit);
        paramIndex++;
      }

      if (filter.offset) {
        query += ` OFFSET $${paramIndex}`;
        params.push(filter.offset);
      }

      const result = await db.query<DBNotification>(query, params);
      return result.rows.map(this.dbToNotification);
    } catch (error) {
      logger.error('Failed to get notifications:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filter,
      });
      throw error;
    }
  }

  /**
   * Get notification counts for a user
   */
  async getNotificationCount(userId: string): Promise<NotificationCount> {
    try {
      const result = await db.query<NotificationCountRow>(
        `SELECT
          type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE NOT read) as unread
        FROM notifications
        WHERE user_id = $1
        GROUP BY type`,
        [userId]
      );

      const counts: NotificationCount = {
        total: 0,
        unread: 0,
        byType: {
          alert: 0,
          info: 0,
          success: 0,
          warning: 0,
          error: 0,
        },
      };

      result.rows.forEach(row => {
        counts.total += Number(row.total);
        counts.unread += Number(row.unread);
        counts.byType[row.type] = Number(row.total);
      });

      return counts;
    } catch (error) {
      logger.error('Failed to get notification counts:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    try {
      await db.query(
        `UPDATE notifications
        SET read = true, read_at = NOW()
        WHERE user_id = $1 AND id = ANY($2)`,
        [userId, notificationIds]
      );

      // Send real-time update
      io.to(`user:${userId}`).emit('notifications:updated', {
        notificationIds,
        read: true,
      });
    } catch (error) {
      logger.error('Failed to mark notifications as read:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        notificationIds,
      });
      throw error;
    }
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(userId: string, notificationIds: string[]): Promise<void> {
    try {
      await db.query(
        'DELETE FROM notifications WHERE user_id = $1 AND id = ANY($2)',
        [userId, notificationIds]
      );

      // Send real-time update
      io.to(`user:${userId}`).emit('notifications:deleted', {
        notificationIds,
      });
    } catch (error) {
      logger.error('Failed to delete notifications:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        notificationIds,
      });
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const result = await db.query<NotificationPreferences>(
        'SELECT preferences FROM user_notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        const preferences = {
          ...this.DEFAULT_PREFERENCES,
          userId,
        };
        await this.updatePreferences(userId, preferences);
        return preferences;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get notification preferences:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO user_notification_preferences (user_id, preferences)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO UPDATE SET preferences = $2`,
        [userId, preferences]
      );
    } catch (error) {
      logger.error('Failed to update notification preferences:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      const preferences = await this.getPreferences(notification.userId);

      // Check if notifications are muted
      if (preferences.mutedUntil && preferences.mutedUntil > new Date()) {
        return;
      }

      // Check if this notification type is enabled
      if (!preferences.alertTypes[notification.type]) {
        return;
      }

      // Send web notification
      if (preferences.webEnabled) {
        io.to(`user:${notification.userId}`).emit('notification:new', notification);
      }

      // Send desktop notification
      if (preferences.desktopEnabled) {
        io.to(`user:${notification.userId}`).emit('notification:desktop', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          duration: 5000,
          link: notification.link,
          timestamp: notification.timestamp
        });
      }

      // Send Gotify notification
      if (preferences.gotifyEnabled) {
        await this.sendGotifyNotification({
          title: notification.title,
          message: notification.message,
          priority: this.GOTIFY_PRIORITIES[notification.type],
          link: notification.link,
        });
      }
    } catch (error) {
      logger.error('Failed to send notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notification,
      });
    }
  }

  /**
   * Convert database notification to API notification
   */
  private dbToNotification(db: DBNotification): Notification {
    const now = new Date();
    return {
      id: db.id,
      userId: db.user_id,
      type: db.type,
      title: db.title,
      message: db.message,
      metadata: db.metadata,
      alert: db.alert ? this.recordToAlert(db.alert) : undefined,
      link: db.link,
      read: db.read,
      readAt: db.read_at,
      timestamp: db.created_at,
      createdAt: db.created_at,
      updatedAt: now
    };
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
