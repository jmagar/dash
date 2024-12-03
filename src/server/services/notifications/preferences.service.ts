import { db } from '../../db';
import { logger } from '../../utils/logger';
import { ApiError } from '../../../types/error';
import { 
  NotificationChannel,
  NotificationType,
  NotificationPreferences,
  WebChannelConfig,
  GotifyChannelConfig,
  DesktopChannelConfig
} from '../../../types/notifications';
import { DBNotificationPreferences } from './types';
import { validateNotificationPreferences, validatePartialNotificationPreferences } from '../../validators/notification-preferences.validator';
import { LoggingManager } from '../../../../../../../../../../utils/logging/LoggingManager';

export class NotificationPreferencesService {
  private readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    userId: '',
    channels: {
      [NotificationChannel.Web]: {
        enabled: true,
        types: [],
        config: {
          desktop: true,
          sound: true,
          timeout: 5000
        } as WebChannelConfig
      },
      [NotificationChannel.Gotify]: {
        enabled: false,
        types: [],
        config: {
          priority: 5
        } as GotifyChannelConfig
      },
      [NotificationChannel.Desktop]: {
        enabled: true,
        types: [],
        config: {
          sound: true,
          position: 'top-right',
          duration: 5000
        } as DesktopChannelConfig
      }
    },
    muted: false,
    alertTypes: {
      [NotificationType.Alert]: true,
      [NotificationType.Info]: true,
      [NotificationType.Success]: true,
      [NotificationType.Warning]: true,
      [NotificationType.Error]: true
    },
    globalConfig: {
      batchNotifications: false,
      batchInterval: 300000, // 5 minutes
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        days: [0, 6] // Sunday and Saturday
      }
    }
  };

  public async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const result = await db.query<DBNotificationPreferences>(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          ...this.DEFAULT_PREFERENCES,
          userId
        };
      }

      const dbPrefs = result.rows[0];
      return this.mapDBToPreferences(dbPrefs);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to get notification preferences', 500);
    }
  }

  public async updatePreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const currentPrefs = await this.getPreferences(userId);
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
        userId
      };

      const result = await db.query<DBNotificationPreferences>(
        `INSERT INTO notification_preferences (
          user_id, channels, muted, muted_until, alert_types, global_config
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          channels = $2,
          muted = $3,
          muted_until = $4,
          alert_types = $5,
          global_config = $6,
          updated_at = NOW()
        RETURNING *`,
        [
          userId,
          updatedPrefs.channels,
          updatedPrefs.muted,
          updatedPrefs.mutedUntil,
          updatedPrefs.alertTypes,
          updatedPrefs.globalConfig
        ]
      );

      return this.mapDBToPreferences(result.rows[0]);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      throw new ApiError('Failed to update notification preferences', 500);
    }
  }

  private mapDBToPreferences(dbPrefs: DBNotificationPreferences): NotificationPreferences {
    return {
      id: dbPrefs.id,
      userId: dbPrefs.user_id,
      channels: dbPrefs.channels,
      muted: dbPrefs.muted,
      mutedUntil: dbPrefs.muted_until ? new Date(dbPrefs.muted_until) : undefined,
      alertTypes: dbPrefs.alert_types,
      globalConfig: dbPrefs.global_config,
      createdAt: new Date(dbPrefs.created_at),
      updatedAt: new Date(dbPrefs.updated_at)
    };
  }
}

export const preferencesService = new NotificationPreferencesService();

