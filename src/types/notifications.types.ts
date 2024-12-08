export type NotificationType = 'alert' | 'info' | 'warning' | 'error' | 'success';

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  serviceName: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  types: NotificationType[];
  enabled: boolean;
}

export interface NotificationEntity {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
  delivered: boolean;
  deliveredAt?: Date;
  channel?: string;
}

export function isNotificationType(type: string): type is NotificationType {
  return ['alert', 'info', 'warning', 'error', 'success'].includes(type);
}

export function isNotificationChannel(channel: unknown): channel is NotificationChannel {
  if (!channel || typeof channel !== 'object') return false;
  const c = channel as NotificationChannel;
  return typeof c.id === 'string' && 
         typeof c.name === 'string' && 
         typeof c.enabled === 'boolean';
}

export function isNotificationPreferences(prefs: unknown): prefs is NotificationPreferences {
  if (!prefs || typeof prefs !== 'object') return false;
  const p = prefs as NotificationPreferences;
  return typeof p.userId === 'string' && 
         Array.isArray(p.channels) &&
         Array.isArray(p.types) &&
         typeof p.enabled === 'boolean';
}

export function isNotificationEntity(entity: unknown): entity is NotificationEntity {
  if (!entity || typeof entity !== 'object') return false;
  const e = entity as NotificationEntity;
  return typeof e.id === 'string' &&
         typeof e.userId === 'string' &&
         isNotificationType(e.type) &&
         typeof e.title === 'string' &&
         typeof e.message === 'string' &&
         e.timestamp instanceof Date &&
         typeof e.read === 'boolean' &&
         typeof e.delivered === 'boolean';
}

export function isPartialNotificationPreferences(prefs: unknown): boolean {
  if (!prefs || typeof prefs !== 'object') return false;
  const p = prefs as Partial<NotificationPreferences>;
  return (p.userId === undefined || typeof p.userId === 'string') &&
         (p.channels === undefined || Array.isArray(p.channels)) &&
         (p.types === undefined || Array.isArray(p.types)) &&
         (p.enabled === undefined || typeof p.enabled === 'boolean');
}
