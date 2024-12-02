import type { NotificationEntity, NotificationType, NotificationPreferences } from '../../../types/notifications';

export interface BatchQueue {
  notifications: Partial<NotificationEntity>[];
  timer: NodeJS.Timeout | null;
  lastProcessed: Date;
}

export interface NotificationCountRow {
  type: NotificationType;
  total: string;
  unread: string;
}

export interface DBNotificationPreferences {
  id: string;
  user_id: string;
  channels: NotificationPreferences['channels'];
  muted: boolean;
  muted_until: string | null;
  alert_types: NotificationPreferences['alertTypes'];
  global_config: NotificationPreferences['globalConfig'];
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryOptions {
  userId: string;
  notification: NotificationEntity;
  preferences: NotificationPreferences;
}
