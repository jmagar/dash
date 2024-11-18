import type { Alert } from './metrics-alerts';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  alert?: Alert;
  link?: string;
  read: boolean;
  readAt?: Date;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Database representation of a notification
export interface DBNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  alert?: Record<string, unknown>;
  link?: string;
  read: boolean;
  read_at?: Date;
  created_at: Date;
}

// Gotify notification event
export interface NotificationGotifyEvent {
  title: string;
  message: string;
  priority: number;
  link?: string;
}

export interface DesktopNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration: number;
  icon?: string;
  link?: string;
  timestamp: Date;
}

export interface NotificationPreferences {
  userId: string;
  web: NotificationType[];
  gotify: NotificationType[];
  desktop: NotificationType[];
  muted: boolean;
  mutedUntil?: Date;
  alertTypes: {
    alert: boolean;
    info: boolean;
    success: boolean;
    warning: boolean;
    error: boolean;
  };
  webEnabled: boolean;
  gotifyEnabled: boolean;
  desktopEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'web' | 'gotify' | 'desktop';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface NotificationFilter {
  type?: NotificationType[];
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationCount {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationPreferencesResponse {
  success: boolean;
  error?: string;
  data?: NotificationPreferences;
}

// For backward compatibility
export type NotificationPreferencesV1 = NotificationPreferences;
export type NotificationPreferencesV2 = NotificationPreferences;
export type NotificationPreferencesConverter = (prefs: NotificationPreferencesV1) => NotificationPreferencesV2;
