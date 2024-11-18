import type {
  NotificationType,
  NotificationPreferences,
  NotificationPreferencesV1,
  NotificationPreferencesV2,
} from '../../types/notifications';

export interface NotificationPreferencesConverter {
  toV2(v1: NotificationPreferencesV1): NotificationPreferencesV2;
  toV1(v2: NotificationPreferencesV2): NotificationPreferencesV1;
}

export class NotificationPreferencesConverterImpl implements NotificationPreferencesConverter {
  toV2(v1: NotificationPreferencesV1): NotificationPreferencesV2 {
    return {
      userId: v1.userId,
      web: v1.web,
      gotify: v1.gotify,
      desktop: v1.desktop,
      muted: v1.muted,
      mutedUntil: v1.mutedUntil,
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
      createdAt: v1.createdAt,
      updatedAt: v1.updatedAt
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
      userId: v2.userId,
      web: getEnabledTypes(v2.webEnabled),
      gotify: getEnabledTypes(v2.gotifyEnabled),
      desktop: getEnabledTypes(v2.desktopEnabled),
      muted: v2.muted,
      mutedUntil: v2.mutedUntil,
      alertTypes: v2.alertTypes,
      webEnabled: v2.webEnabled,
      gotifyEnabled: v2.gotifyEnabled,
      desktopEnabled: v2.desktopEnabled,
      createdAt: v2.createdAt,
      updatedAt: v2.updatedAt
    };
  }

  // Helper method to convert channel preferences
  convertChannelPreferences(channel: 'web' | 'gotify' | 'desktop', v2: NotificationPreferencesV2): NotificationType[] {
    const enabled = v2[`${channel}Enabled`];
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
  getEnabledTypes(v1: NotificationPreferencesV1, channel: 'web' | 'gotify' | 'desktop'): NotificationType[] {
    return v1[channel];
  }
}

export const notificationPreferencesConverter = new NotificationPreferencesConverterImpl();
