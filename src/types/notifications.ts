import type { Alert } from './metrics-alerts';

export type NotificationType =
  | 'alert'      // System alerts
  | 'info'       // General information
  | 'success'    // Success messages
  | 'warning'    // Warning messages
  | 'error';     // Error messages

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  alert?: Alert;  // Associated alert if type is 'alert'
  link?: string;  // Optional link to related page/resource
}

export interface NotificationPreferences {
  userId: string;
  webEnabled: boolean;
  gotifyEnabled: boolean;
  desktopEnabled: boolean;
  alertTypes: {
    [K in NotificationType]: boolean;
  };
  mutedUntil?: Date;
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

export interface NotificationDesktopEvent {
  title: string;
  message: string;
  icon?: string;
  link?: string;
}

export interface NotificationGotifyEvent {
  title: string;
  message: string;
  priority?: number;
  link?: string;
}
