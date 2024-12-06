import axios from 'axios';
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
import { LoggingManager } from '../../managers/LoggingManager';
import { LoggerAdapter } from '../../utils/logging/logger.adapter';
import type { Logger, LogMetadata } from '../../../types/logger';

export class NotificationDeliveryService {
  private readonly logger: Logger;
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

  constructor(io: SocketIOServer, logManager?: LoggingManager) {
    const baseLogger = logManager ?? LoggingManager.getInstance();
    this.logger = new LoggerAdapter(baseLogger, {
      component: 'NotificationDeliveryService',
      service: 'NotificationService'
    });

    this.gotifyUrl = config.gotify?.url;
    this.gotifyToken = config.gotify?.token;
    this.io = io;

    this.logger.info('NotificationDeliveryService initialized', {
      hasGotify: Boolean(this.gotifyUrl && this.gotifyToken)
    });
  }

  public async deliverNotification({ userId, notification, preferences }: NotificationDeliveryOptions): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'deliverNotification',
      userId,
      notificationId: notification.id,
      notificationType: notification.type
    });

    try {
      const enabledChannels = Object.values(NotificationChannel).filter(channel => 
        this.shouldDeliverNotification(notification, preferences, channel)
      );

      methodLogger.info('Starting notification delivery', {
        channels: enabledChannels
      });

      // Send web notification
      if (enabledChannels.includes(NotificationChannel.Web)) {
        this.sendWebNotification(notification);
      }

      // Send desktop notification
      if (enabledChannels.includes(NotificationChannel.Desktop)) {
        this.sendDesktopNotification(notification, preferences);
      }

      // Send Gotify notification
      if (enabledChannels.includes(NotificationChannel.Gotify)) {
        await this.sendGotifyNotification(notification, preferences);
      }

      const duration = Date.now() - startTime;
      methodLogger.info('Notification delivery completed', {
        timing: { total: duration },
        channelsDelivered: enabledChannels
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to deliver notification', metadata);
      throw new ApiError('Failed to deliver notification', 500);
    }
  }

  private sendWebNotification(notification: NotificationEntity): void {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'sendWebNotification',
      userId: notification.userId,
      notificationId: notification.id
    });

    try {
      methodLogger.debug('Sending web notification');

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

      const duration = Date.now() - startTime;
      methodLogger.info('Web notification sent', {
        timing: { total: duration }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to send web notification', metadata);
      throw new ApiError('Failed to send web notification', 500);
    }
  }

  private sendDesktopNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences
  ): void {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'sendDesktopNotification',
      userId: notification.userId,
      notificationId: notification.id
    });

    try {
      methodLogger.debug('Sending desktop notification');

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

      const duration = Date.now() - startTime;
      methodLogger.info('Desktop notification sent', {
        timing: { total: duration },
        config: {
          duration: config?.duration,
          sound: config?.sound,
          position: config?.position
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to send desktop notification', metadata);
      throw new ApiError('Failed to send desktop notification', 500);
    }
  }

  private async sendGotifyNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences
  ): Promise<void> {
    const startTime = Date.now();
    const methodLogger = this.logger.withContext({
      operation: 'sendGotifyNotification',
      userId: notification.userId,
      notificationId: notification.id
    });

    try {
      if (!this.gotifyUrl || !this.gotifyToken) {
        methodLogger.warn('Gotify not configured', {
          hasUrl: Boolean(this.gotifyUrl),
          hasToken: Boolean(this.gotifyToken)
        });
        return;
      }

      methodLogger.debug('Sending Gotify notification');

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

      const duration = Date.now() - startTime;
      methodLogger.info('Gotify notification sent', {
        timing: { total: duration },
        priority: message.priority
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const metadata: LogMetadata = {
        error: error instanceof Error ? error : new Error(String(error)),
        timing: { total: duration }
      };
      methodLogger.error('Failed to send Gotify notification', metadata);
      throw new ApiError('Failed to send Gotify notification', 500);
    }
  }

  private shouldDeliverNotification(
    notification: NotificationEntity,
    preferences: NotificationPreferences,
    channel: NotificationChannel
  ): boolean {
    const methodLogger = this.logger.withContext({
      operation: 'shouldDeliverNotification',
      userId: notification.userId,
      notificationId: notification.id,
      channel
    });

    // Check if notifications are muted globally
    if (preferences.muted) {
      methodLogger.debug('Notifications muted globally');
      return false;
    }

    // Check if muted temporarily
    if (preferences.mutedUntil && new Date() < preferences.mutedUntil) {
      methodLogger.debug('Notifications temporarily muted', {
        mutedUntil: preferences.mutedUntil
      });
      return false;
    }

    // Check channel preferences
    const channelPrefs = preferences.channels[channel];
    if (!channelPrefs?.enabled) {
      methodLogger.debug('Channel disabled', { channel });
      return false;
    }

    // Check if notification type is enabled for this channel
    if (channelPrefs.types.length > 0 && !channelPrefs.types.includes(notification.type)) {
      methodLogger.debug('Notification type not enabled for channel', {
        type: notification.type,
        channel,
        enabledTypes: channelPrefs.types
      });
      return false;
    }

    // Check alert type preferences
    if (!preferences.alertTypes[notification.type]) {
      methodLogger.debug('Alert type disabled', {
        type: notification.type
      });
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
          methodLogger.debug('In quiet hours', {
            currentTime: `${now.getHours()}:${now.getMinutes()}`,
            quietHours: {
              start: quietHours.start,
              end: quietHours.end,
              days: quietHours.days
            }
          });
          return false;
        }
      }
    }

    methodLogger.debug('Notification delivery allowed', { channel });
    return true;
  }
}

// Export a factory function instead of instance
export const createDeliveryService = (io: SocketIOServer, logManager?: LoggingManager): NotificationDeliveryService => {
  return new NotificationDeliveryService(io, logManager);
};
