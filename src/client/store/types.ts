/**
 * Common type definitions for Redux store
 */

import { NotificationType, NotificationEntity, ServiceStatus } from '../../types/notifications';

export type ThemeMode = 'light' | 'dark' | 'system';

// UI State
export interface UIState {
  loading: boolean;
  sidebarOpen: boolean;
  theme: ThemeMode;
}

// Notification State
export interface NotificationState {
  notifications: NotificationEntity[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// Root State
export interface RootState {
  ui: UIState;
  notification: NotificationState;
}

// Action Types
export interface BaseAction<T = any> {
  type: string;
  payload?: T;
}

// Action Payloads
export interface ShowNotificationPayload {
  message: string;
  type: NotificationType;
  title: string;
  metadata?: Record<string, unknown>;
  link?: string;
  status?: ServiceStatus;
}

export interface HideNotificationPayload {
  id: string;
}

export interface UpdateNotificationPayload {
  id: string;
  updates: Partial<NotificationEntity>;
}

export interface MarkAsReadPayload {
  id: string;
}

export interface BatchMarkAsReadPayload {
  ids: string[];
}

export interface ClearNotificationsPayload {
  userId: string;
}

export interface SetThemePayload {
  theme: ThemeMode;
}

export interface SetSidebarPayload {
  open: boolean;
}
