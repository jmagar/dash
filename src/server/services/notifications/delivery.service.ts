import axios from 'axios';
import { logger } from '../../utils/logger';
import { Server as SocketIOServer } from 'socket.io';
import config from '../../config';
import { ApiError } from '../../../types/error';
import { ServiceStatus } from '../../../types/status';
import { 
  NotificationChannel, 
  NotificationType,
  GotifyNotificationOptions,
  NotificationEntity,
  NotificationPreferences,
  DesktopChannelConfig,
  GotifyChannelConfig,
  NotificationEvent
} from '../../../types/notifications';
import { NotificationDeliveryOptions } from './types';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

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
  private readonly io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.gotifyUrl = config.gotify?.url;
    this.gotifyToken = config.gotify?.token;
    this.io = io;
  }

  public async deliverNotification({ userId, notification, preferences }: NotificationDeliveryOptions): Promise<void> {
    try {
      // Send web notification
      if (this.shouldDeliverNotification(notification, preferences, NotificationChannel.Web)) {
        await this.sendWebNotification(notification, preferences);
      }

      // Send desktop notification
      if (this.shouldDeliverNotification(notification, preferences, NotificationChannel.Desktop)) {
        await this.sendDesktopNotification(notification, preferences);
      }

      // Send Gotify notification
      if (this.shouldDeliverNotification(notification, preferences, NotificationChannel.Gotify)) {
        await this.sendGotifyNotification(notification, preferences);
      }

      loggerLoggingManager.getInstance().();
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to deliver notification', 500);
    }
  }

  private sendWebNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const event: NotificationEvent = {
          type: 'notification:created',
          payload: { 
            notification: {
              ...notification,
              status: ServiceStatus.SENT,
              channel: NotificationChannel.Web
            }
          },
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          serviceName: 'notifications'
        };

        this.io.to(`user:${notification.userId}`).emit('notification', event);

        loggerLoggingManager.getInstance().();
        resolve();
      } catch (error) {
        loggerLoggingManager.getInstance().();
        reject(new ApiError('Failed to send web notification', 500));
      }
    });
  }

  private sendDesktopNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const config = preferences.channels[NotificationChannel.Desktop]?.config as DesktopChannelConfig;
        const event: NotificationEvent = {
          type: 'notification:created',
          payload: { 
            notification: {
              ...notification,
              status: ServiceStatus.SENT,
              channel: NotificationChannel.Desktop
            }
          },
          id: `event-${Date.now()}`,
          timestamp: new Date(),
          serviceName: 'notifications'
        };

        this.io.to(`user:${notification.userId}`).emit('notification:desktop', {
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

        this.io.to(`user:${notification.userId}`).emit('notification', event);

        loggerLoggingManager.getInstance().();
        resolve();
      } catch (error) {
        loggerLoggingManager.getInstance().();
        reject(new ApiError('Failed to send desktop notification', 500));
      }
    });
  }

  private async sendGotifyNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      if (!this.gotifyUrl || !this.gotifyToken) {
        loggerLoggingManager.getInstance().();
        return;
      }

      const channelConfig = preferences.channels[NotificationChannel.Gotify]?.config as GotifyChannelConfig;
      
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

      const event: NotificationEvent = {
        type: 'notification:created',
        payload: { 
          notification: {
            ...notification,
            status: ServiceStatus.SENT,
            channel: NotificationChannel.Gotify
          }
        },
        id: `event-${Date.now()}`,
        timestamp: new Date(),
        serviceName: 'notifications'
      };

      this.io.to(`user:${notification.userId}`).emit('notification', event);

      loggerLoggingManager.getInstance().();
    } catch (error) {
      loggerLoggingManager.getInstance().();
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

// We'll create the delivery service instance when we have access to the socket.io server
export let deliveryService: NotificationDeliveryService;

export function initializeDeliveryService(io: SocketIOServer) {
  deliveryService = new NotificationDeliveryService(io);
}

