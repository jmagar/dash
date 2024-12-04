import { db } from '../../db';
import { logger } from '../../utils/logger';
import { ApiError } from '../../../types/error';
import { 
import { LoggingManager } from '../../managers/utils/LoggingManager';
  NotificationEntity, 
  NotificationFilter, 
  NotificationType,
  ServiceStatus
} from '../../../types/notifications';

export class NotificationDBService {
  async create(notification: NotificationEntity): Promise<NotificationEntity> {
    try {
      const result = await db.query<NotificationEntity>(
        `INSERT INTO notifications (
          id, user_id, type, title, message, metadata, read, timestamp, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          notification.id,
          notification.userId,
          notification.type,
          notification.title,
          notification.message,
          notification.metadata,
          notification.read,
          notification.timestamp,
          notification.status
        ]
      );

      return result.rows[0];
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to create notification', 500);
    }
  }

  async markAsRead(notificationId: string): Promise<NotificationEntity> {
    try {
      const result = await db.query<NotificationEntity>(
        'UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 RETURNING *',
        [notificationId]
      );

      if (result.rows.length === 0) {
        throw new ApiError('Notification not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error instanceof ApiError ? error : new ApiError('Failed to mark notification as read', 500);
    }
  }

  async markAllAsRead(userId: string): Promise<NotificationEntity[]> {
    try {
      const result = await db.query<NotificationEntity>(
        'UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND read = false RETURNING *',
        [userId]
      );

      return result.rows;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to mark all notifications as read', 500);
    }
  }

  async delete(notificationId: string): Promise<NotificationEntity> {
    try {
      const result = await db.query<NotificationEntity>(
        'DELETE FROM notifications WHERE id = $1 RETURNING *',
        [notificationId]
      );

      if (result.rows.length === 0) {
        throw new ApiError('Notification not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw error instanceof ApiError ? error : new ApiError('Failed to delete notification', 500);
    }
  }

  async getById(notificationId: string): Promise<NotificationEntity | null> {
    try {
      const result = await db.query<NotificationEntity>(
        'SELECT * FROM notifications WHERE id = $1',
        [notificationId]
      );
      return result.rows[0] || null;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to get notification', 500);
    }
  }

  async getByUserId(userId: string, filter?: NotificationFilter): Promise<NotificationEntity[]> {
    try {
      const conditions: string[] = ['user_id = $1'];
      const params: any[] = [userId];
      let paramCount = 1;

      if (filter?.type?.length) {
        paramCount++;
        conditions.push(`type = ANY($${paramCount})`);
        params.push(filter.type);
      }

      if (typeof filter?.read === 'boolean') {
        paramCount++;
        conditions.push(`read = $${paramCount}`);
        params.push(filter.read);
      }

      if (filter?.startDate) {
        paramCount++;
        conditions.push(`timestamp >= $${paramCount}`);
        params.push(filter.startDate);
      }

      if (filter?.endDate) {
        paramCount++;
        conditions.push(`timestamp <= $${paramCount}`);
        params.push(filter.endDate);
      }

      if (filter?.status?.length) {
        paramCount++;
        conditions.push(`status = ANY($${paramCount})`);
        params.push(filter.status);
      }

      const query = `
        SELECT * FROM notifications
        WHERE ${conditions.join(' AND ')}
        ORDER BY timestamp DESC
        ${filter?.limit ? `LIMIT ${filter.limit}` : ''}
        ${filter?.offset ? `OFFSET ${filter.offset}` : ''}
      `;

      const result = await db.query<NotificationEntity>(query, params);
      return result.rows;
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to get notifications', 500);
    }
  }

  async getNotificationCounts(userId: string): Promise<Record<NotificationType, { total: number; unread: number }>> {
    try {
      const result = await db.query<{ type: NotificationType; total: string; unread: string }>(
        `SELECT 
          type,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE read = false) as unread
        FROM notifications
        WHERE user_id = $1
        GROUP BY type`,
        [userId]
      );

      return result.rows.reduce((acc, row) => {
        acc[row.type] = {
          total: parseInt(row.total),
          unread: parseInt(row.unread)
        };
        return acc;
      }, {} as Record<NotificationType, { total: number; unread: number }>);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to get notification counts', 500);
    }
  }
}

export const notificationDBService = new NotificationDBService();


