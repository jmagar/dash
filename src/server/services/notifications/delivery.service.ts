import axios from 'axios';
import { logger } from '../../utils/logger';
import { io } from '../../server';
import config from '../../config';
import { ApiError } from '../../../types/error';
import { 
  NotificationChannel, 
  NotificationType,
  GotifyNotificationOptions,
  NotificationEntity,
  NotificationPreferences,
  DesktopChannelConfig,
  GotifyChannelConfig
} from '../../../types/notifications';
import { NotificationDeliveryOptions } from './types';

export class NotificationDeliveryService {
  private readonly GOTIFY_PRIORITIES: Record<NotificationType, number> = {
    [NotificationType.Error]: 8,
    [NotificationType.Alert]: 7,
    [NotificationType.Warning]: 5,
    [NotificationType.Info]: 3,
    [NotificationType.Success]: 3,
  };

  private readonly gotifyUrl: string | undefined;
  private readonly gotifyToken: string | undefined;

  constructor() {
    this.gotifyUrl = config.gotify?.url;
    this.gotifyToken = config.gotify?.token;
  }

  public async deliverNotification({ userId, notification, preferences }: NotificationDeliveryOptions): Promise<void> {
    try {
      // Send web notification
      if (this.shouldDeliverNotification(notification, preferences, 'web')) {
        io.to(`user:${userId}`).emit('notification:new', notification);
      }

      // Send desktop notification
      if (this.shouldDeliverNotification(notification, preferences, 'desktop')) {
        const config = preferences.channels.desktop.config as DesktopChannelConfig;
        io.to(`user:${userId}`).emit('notification:desktop', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          duration: config?.duration ?? 5000,
          sound: config?.sound ?? true,
          position: config?.position ?? 'top-right',
          link: notification.link,
          timestamp: notification.timestamp
        });
      }

      // Send Gotify notification
      if (this.shouldDeliverNotification(notification, preferences, 'gotify')) {
        await this.sendGotifyNotification(notification, preferences);
      }

      logger.info('Notification delivered', {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      logger.error('Failed to deliver notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type
      });
      throw new ApiError('Failed to deliver notification', 500);
    }
  }

  private async sendGotifyNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      if (!this.gotifyUrl || !this.gotifyToken) {
        return;
      }

      const channelConfig = preferences.channels[NotificationChannel.Gotify].config as GotifyChannelConfig;
      
      const url = `${this.gotifyUrl.replace(/\/$/, '')}/message`;
      const message: GotifyNotificationOptions = {
        title: notification.title,
        message: notification.message,
        priority: channelConfig?.priority ?? this.GOTIFY_PRIORITIES[notification.type],
        extras: notification.metadata
      };

      await axios.post(url, message, {
        headers: {
          'X-Gotify-Key': this.gotifyToken
        }
      });

      logger.info('Gotify notification sent', {
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type
      });
    } catch (error) {
      logger.error('Failed to send Gotify notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type
      });
      throw new ApiError('Failed to send Gotify notification', 500);
    }
  }

  private shouldDeliverNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences,
    channel: NotificationChannel
  ): boolean {
    // Check if notifications are muted globally
    if (preferences.muted) {
      return false;
    }

    // Check if muted temporarily
    if (preferences.mutedUntil && new Date() < preferences.mutedUntil) {
      return false;
    }

    // Check channel preferences
    const channelPrefs = preferences.channels[channel];
    if (!channelPrefs?.enabled) {
      return false;
    }

    // Check if notification type is enabled for this channel
    if (channelPrefs.types.length > 0 && !channelPrefs.types.includes(notification.type)) {
      return false;
    }

    // Check alert type preferences
    if (!preferences.alertTypes[notification.type]) {
      return false;
    }

    // Check quiet hours
    const quietHours = preferences.globalConfig?.quietHours;
    if (quietHours?.enabled) {
      const now = new Date();
      const currentDay = now.getDay();
      
      // Check if current day is in quiet hours
      if (quietHours.days?.includes(currentDay)) {
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const startTime = parseInt(quietHours.start?.replace(':', '') || '0000');
        const endTime = parseInt(quietHours.end?.replace(':', '') || '0000');
        
        if (startTime <= currentTime && currentTime <= endTime) {
          return false;
        }
      }
    }

    return true;
  }
}

export const deliveryService = new NotificationDeliveryService();
