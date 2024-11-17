import type {
  NotificationType,
  NotificationChannel,
  NotificationPreferencesV1,
  NotificationPreferencesV2,
  NotificationPreferencesConverter,
} from '../../types/notifications';

export class NotificationPreferencesConverterImpl implements NotificationPreferencesConverter {
  toV2(v1: NotificationPreferencesV1): NotificationPreferencesV2 {
    return {
      webEnabled: v1.web.length > 0,
      gotifyEnabled: v1.gotify.length > 0,
      desktopEnabled: v1.desktop.length > 0,
      alertTypes: {
        alert: v1.web.includes('alert'),
        error: v1.web.includes('error'),
        warning: v1.web.includes('warning'),
        info: v1.web.includes('info'),
        success: v1.web.includes('success'),
      },
    };
  }

  toV1(v2: NotificationPreferencesV2): NotificationPreferencesV1 {
    const getEnabledTypes = (enabled: boolean): NotificationType[] => {
      if (!enabled) return [];
      return Object.entries(v2.alertTypes)
        .filter(([_, isEnabled]) => isEnabled)
        .map(([type]) => type as NotificationType);
    };

    return {
      web: getEnabledTypes(v2.webEnabled),
      gotify: getEnabledTypes(v2.gotifyEnabled),
      desktop: getEnabledTypes(v2.desktopEnabled),
    };
  }

  // Helper method to convert channel preferences
  convertChannelPreferences(channel: NotificationChannel, v2: NotificationPreferencesV2): NotificationType[] {
    const enabled = v2[`${channel}Enabled` as keyof NotificationPreferencesV2] as boolean;
    return enabled
      ? Object.entries(v2.alertTypes)
          .filter(([_, isEnabled]) => isEnabled)
          .map(([type]) => type as NotificationType)
      : [];
  }

  // Helper method to check if a channel has any enabled types
  hasEnabledTypes(types: NotificationType[]): boolean {
    return types.length > 0;
  }

  // Helper method to get enabled types for a channel
  getEnabledTypes(v1: NotificationPreferencesV1, channel: NotificationChannel): NotificationType[] {
    return v1[channel];
  }
}

export const notificationPreferencesConverter = new NotificationPreferencesConverterImpl();
