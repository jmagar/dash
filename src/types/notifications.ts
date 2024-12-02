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

export interface WebChannelConfig {
  desktop: boolean;
  sound: boolean;
  timeout?: number;
}

export interface GotifyChannelConfig {
  priority?: number;
  serverUrl?: string;
}

export interface DesktopChannelConfig {
  sound: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration?: number;
}

export interface ChannelConfig {
  web: WebChannelConfig;
  gotify: GotifyChannelConfig;
  desktop: DesktopChannelConfig;
}

export interface ChannelPreferences {
  enabled: boolean;
  types: NotificationType[];
  config?: Partial<ChannelConfig>;
}

export interface QuietHours {
  enabled: boolean;
  start?: string; // HH:mm format
  end?: string; // HH:mm format
  days?: number[]; // 0-6, where 0 is Sunday
}

export interface GlobalConfig {
  batchNotifications?: boolean;
  batchInterval?: number; // milliseconds
  quietHours?: QuietHours;
}

export interface NotificationEntity extends BaseEntity {
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
  status: ServiceStatus;
  channel: NotificationChannel;
}

export interface NotificationEvent extends ServiceEvent {
  type: 'notification:created' | 'notification:updated' | 'notification:deleted' | 'notification:bulk_updated';
  payload: {
    notification?: NotificationEntity;
    notifications?: NotificationEntity[];
    channel?: NotificationChannel;
    changes?: Record<string, unknown>;
    action?: string;
  };
}

export interface NotificationPreferences {
  id?: string;
  userId: string;
  channels: Record<NotificationChannel, ChannelPreferences>;
  muted: boolean;
  mutedUntil?: Date;
  alertTypes: Record<NotificationType, boolean>;
  globalConfig?: GlobalConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationFilter {
  type?: NotificationType[];
  read?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  status?: ServiceStatus[];
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
  byStatus: Record<ServiceStatus, number>;
}

export interface NotificationDelivery extends BaseEntity {
  notificationId: string;
  channel: NotificationChannel;
  status: ServiceStatus;
  error?: string;
  timestamp: Date;
}

export interface DesktopNotificationOptions extends BaseEntity {
  type: NotificationType;
  title: string;
  message: string;
  duration: number;
  icon?: string;
  link?: string;
  timestamp: Date;
}

export interface GotifyNotificationOptions {
  title: string;
  message: string;
  priority?: number;
  extras?: Record<string, unknown>;
}

export interface NotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  data?: unknown;
  batch?: boolean;
  batchKey?: string;
  batchInterval?: number;
}

export interface NotificationPreferencesResponse extends Result<NotificationPreferences> {
  data?: NotificationPreferences;
}

// Type guards
export function isNotificationType(type: unknown): type is NotificationType {
  return typeof type === 'string' && Object.values(NotificationType).includes(type as NotificationType);
}

export function isNotificationChannel(channel: unknown): channel is NotificationChannel {
  return typeof channel === 'string' && Object.values(NotificationChannel).includes(channel as NotificationChannel);
}

export function isNotificationEntity(obj: unknown): obj is NotificationEntity {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'userId' in obj &&
    'type' in obj &&
    'title' in obj &&
    'message' in obj &&
    'status' in obj &&
    'channel' in obj;
}

export function isNotificationDelivery(obj: unknown): obj is NotificationDelivery {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'notificationId' in obj &&
    'channel' in obj &&
    'status' in obj;
}

export function isNotificationPreferences(obj: unknown): obj is NotificationPreferences {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'userId' in obj &&
    'channels' in obj &&
    'alertTypes' in obj;
}
