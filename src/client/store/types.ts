/**
 * Common type definitions for Redux store actions
 */

import type { NotificationType } from '../../types/notifications';
import type { ThemeMode } from './storeTypes';

// Service Status type
export type ServiceStatus = 'active' | 'inactive' | 'error' | 'warning' | 'info';

// Action Types
export interface BaseAction<TPayload = unknown> {
  type: string;
  payload?: TPayload;
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
  updates: Partial<import('../../types/notifications').NotificationEntity>;
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
