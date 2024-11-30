/**
 * Common type definitions for Redux store
 */

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

export type ThemeMode = 'light' | 'dark' | 'system';

// UI State
export interface UIState {
  loading: boolean;
  sidebarOpen: boolean;
  theme: ThemeMode;
}

// Notification State
export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: string;
  autoHideDuration?: number;
}

export interface NotificationState {
  notifications: Notification[];
}

// Root State
export interface RootState {
  ui: UIState;
  notification: NotificationState;
}

// Action Types
export interface BaseAction<T = unknown> {
  type: string;
  payload?: T;
}

export interface ShowNotificationPayload {
  message: string;
  severity: NotificationSeverity;
}

export interface HideNotificationPayload {
  id: string;
}

export interface SetThemePayload {
  theme: ThemeMode;
}

export interface SetSidebarPayload {
  open: boolean;
}
