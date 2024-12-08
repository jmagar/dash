import { NotificationsService } from '../../services/notifications/notifications.service';
import type { Alert } from './alerts.types';
import { NotificationType } from '../../../types/notifications';
import { LoggingManager } from '../../managers/LoggingManager';

export class AlertNotificationService {
  private static instance: AlertNotificationService | null = null;
  private readonly notificationsService = new NotificationsService();
  private readonly logger = LoggingManager.getInstance();

  /**
   * Private constructor to enforce singleton pattern
   * @private
   */
  private constructor() {
    this.logger.debug('Initializing AlertNotificationService');
  }

  /**
   * Create a notification for an alert
   */
  async createAlertNotification(alert: Alert): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: alert.hostId,
        title: alert.title,
        message: alert.message,
        type: NotificationType.Alert,
        metadata: {
          alert,
          metadata: alert.metadata,
        }
      });
    } catch (error) {
      this.logger.error('Failed to create alert notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alert
      });
    }
  }

  /**
   * Send a notification with the specified parameters
   */
  private async sendNotification(notification: {
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.notificationsService.create({
        userId: 'system', // Default to system notifications
        title: notification.title,
        message: notification.message,
        type: notification.type,
        metadata: notification.data
      });
    } catch (error) {
      this.logger.error('Failed to send notification:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notification
      });
    }
  }

  /**
   * Get the singleton instance of AlertNotificationService
   */
  public static getInstance(): AlertNotificationService {
    if (!AlertNotificationService.instance) {
      AlertNotificationService.instance = new AlertNotificationService();
    }
    return AlertNotificationService.instance;
  }
}

export const alertNotificationService = AlertNotificationService.getInstance();
