import { BaseEntity } from './base';
import { ServiceEvent } from './events';
import { Alert } from './metrics-alerts';
import { Result } from './common';
import { ServiceStatus } from './status';

export enum NotificationType {
  Alert = 'alert',
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}

export enum NotificationChannel {
  Web = 'web',
  Gotify = 'gotify',
  Desktop = 'desktop'
}

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  source: string;
  channel: NotificationChannel;
  read: boolean;
  dismissed: boolean;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface DesktopNotification {
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  timeout?: number;
  onClick?: () => void;
}

export interface NotificationPreferences {
  channels: {
    web: boolean;
    desktop: boolean;
    gotify: boolean;
  };
  types: {
    [key in NotificationType]: boolean;
  };
  sources: string[];
}

// Type guards
export function isNotification(obj: unknown): obj is Notification {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userId' in obj &&
    'type' in obj &&
    'title' in obj &&
    'message' in obj &&
    'source' in obj &&
    'channel' in obj &&
    'read' in obj &&
    'dismissed' in obj &&
    'timestamp' in obj
  );
}

export function isDesktopNotification(obj: unknown): obj is DesktopNotification {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'title' in obj &&
    'message' in obj
  );
}

export function isNotificationPreferences(obj: unknown): obj is NotificationPreferences {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'channels' in obj &&
    'types' in obj &&
    'sources' in obj
  );
}
