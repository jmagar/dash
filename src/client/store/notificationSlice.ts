import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: string;
  autoHideDuration?: number;
}

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [],
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: {
      prepare: (payload: { message: string; severity: NotificationSeverity }) => ({
        payload: {
          id: Date.now().toString(),
          message: payload.message,
          severity: payload.severity,
          timestamp: new Date().toISOString(),
          autoHideDuration: payload.severity === 'error' ? 6000 : 3000,
        } as Notification,
      }),
      reducer: (state, action: PayloadAction<Notification>) => {
        state.notifications.push(action.payload);
      },
    },
    hideNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { showNotification, hideNotification, clearNotifications } = notificationSlice.actions;

export default notificationSlice.reducer;
