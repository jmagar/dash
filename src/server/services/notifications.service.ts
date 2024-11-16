import { EventEmitter } from 'events';
import axios from 'axios';
import { db } from '../db';
import { config } from '../config';
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

class NotificationsService extends EventEmitter {
  private readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    userId: '',
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
  };

  private readonly GOTIFY_PRIORITIES = {
    error: 8,
    alert: 7,
    warning: 5,
    info: 3,
    success: 3,
  };

  /**
   * Send notification to Gotify
   */
  private async sendGotifyNotification(event: NotificationGotifyEvent): Promise<boolean> {
    if (!config.gotify.url || !config.gotify.token) {
      return false;
    }

    try {
      const url = `${config.gotify.url.replace(/\/$/, '')}/message`;
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
          'X-Gotify-Key': config.gotify.token,
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
      const dbNotification: Omit<DBNotification, 'created_at' | 'read_at'> = {
        id: crypto.randomUUID(),
        user_id: userId,
        type,
        title,
        message,
        metadata: options.metadata,
        alert: options.alert,
        link: options.link,
        read: false,
      };

      const result = await db.query<DBNotification>(
        `INSERT INTO notifications (
          id, user_id, type, title, message, metadata, alert, link, read
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        conditions.push(`type = $${paramIndex}`);
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
      const result = await db.query<{
        type: NotificationType;
        total: number;
        unread: number;
      }>(
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
          title: notification.title,
          message: notification.message,
          link: notification.link,
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
    return {
      id: db.id,
      userId: db.user_id,
      type: db.type,
      title: db.title,
      message: db.message,
      metadata: db.metadata,
      alert: db.alert,
      link: db.link,
      read: db.read,
      readAt: db.read_at ?? undefined,
      createdAt: db.created_at,
    };
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();
