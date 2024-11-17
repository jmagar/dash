import type { Alert } from './metrics-alerts';

export type NotificationType = 'alert' | 'error' | 'warning' | 'info' | 'success';
export type NotificationChannel = 'web' | 'gotify' | 'desktop';

export interface NotificationBase {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export interface WebNotification extends NotificationBase {
  channel: 'web';
  link?: string;
}

export interface GotifyNotification extends NotificationBase {
  channel: 'gotify';
  priority: number;
  link?: string;
}

export interface DesktopNotification extends NotificationBase {
  channel: 'desktop';
  type: NotificationType;
  icon?: string;
  duration?: number;
  link?: string;
}

export type Notification = WebNotification | GotifyNotification | DesktopNotification;

export interface NotificationPreferencesV2 {
  webEnabled: boolean;
  gotifyEnabled: boolean;
  desktopEnabled: boolean;
  alertTypes: {
    [K in NotificationType]: boolean;
  };
}

export interface NotificationPreferencesV1 {
  web: NotificationType[];
  gotify: NotificationType[];
  desktop: NotificationType[];
}

export interface NotificationPreferences {
  userId: string;
  preferences: NotificationPreferencesV2;
}

export interface NotificationFilter {
  userId: string;
  type?: NotificationType;
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface NotificationCount {
  total: number;
  unread: number;
  byType: {
    [K in NotificationType]: number;
  };
}

export interface DBNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  alert?: Alert;
  link?: string;
  read: boolean;
  read_at: Date | null;
  created_at: Date;
}

// Event types for different notification channels
export interface NotificationEvent {
  type: 'new' | 'updated' | 'deleted';
  notification: Notification;
}

export interface NotificationResponse {
  success: boolean;
  error?: string;
  data?: {
    notification?: Notification;
    notifications?: Notification[];
    count?: NotificationCount;
    preferences?: NotificationPreferences;
  };
}

export interface NotificationSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Utility type for converting between V1 and V2 formats
export interface NotificationPreferencesConverter {
  toV2(v1: NotificationPreferencesV1): NotificationPreferencesV2;
  toV1(v2: NotificationPreferencesV2): NotificationPreferencesV1;
}

// Response types
export interface NotificationPreferencesResponse {
  success: boolean;
  error?: string;
  data?: NotificationPreferencesV1;
}

export interface NotificationPreferencesV2Response {
  success: boolean;
  error?: string;
  data?: NotificationPreferencesV2;
}
