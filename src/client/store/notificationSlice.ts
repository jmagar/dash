import { createSlice, createAsyncThunk, PayloadAction, Slice } from '@reduxjs/toolkit';
import type { NotificationEntity } from '../../types/notifications';
import type { NotificationState } from './storeTypes';
import type { ServiceStatus } from './types';
import { logger } from '../utils/frontendLogger';
import { notificationsApi } from '../api/notifications';

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async () => {
    try {
      const response = await notificationsApi.getNotifications();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }
      return response.data || [];
    } catch (error) {
      logger.error('Failed to fetch notifications', { error });
      throw error;
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (id: string) => {
    try {
      const response = await notificationsApi.markAsRead(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
    } catch (error) {
      logger.error('Failed to mark notification as read', { error });
      throw error;
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async (ids: string[]) => {
    try {
      const response = await notificationsApi.markAllAsRead(ids);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark notifications as read');
      }
    } catch (error) {
      logger.error('Failed to mark notifications as read', { error });
      throw error;
    }
  }
);

export const clearNotifications = createAsyncThunk(
  'notification/clearNotifications',
  async (userId: string) => {
    try {
      const response = await notificationsApi.clearNotifications(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to clear notifications');
      }
    } catch (error) {
      logger.error('Failed to clear notifications', { error });
      throw error;
    }
  }
);

const notificationSlice: Slice<NotificationState> = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<NotificationEntity>) {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    updateNotification(state, action: PayloadAction<{ id: string; updates: Partial<NotificationEntity> }>) {
      const { id, updates } = action.payload;
      const index = state.notifications.findIndex(n => n.id === id);
      if (index !== -1) {
        const oldNotification = state.notifications[index];
        if (oldNotification && !oldNotification.read && updates.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications[index] = {
          ...oldNotification,
          ...updates,
          updatedAt: new Date()
        } as NotificationEntity;
      }
    },
    removeNotification(state, action: PayloadAction<string>) {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearAllNotifications(state) {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch notifications';
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.meta.arg);
        if (notification && !notification.read) {
          notification.read = true;
          notification.readAt = new Date();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state, action) => {
        const ids = action.meta.arg;
        state.notifications.forEach(notification => {
          if (ids.includes(notification.id) && !notification.read) {
            notification.read = true;
            notification.readAt = new Date();
          }
        });
        state.unreadCount = state.notifications.filter(n => !n.read).length;
      })
      .addCase(clearNotifications.fulfilled, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
      });
  },
});

export const {
  addNotification,
  updateNotification,
  removeNotification,
  clearAllNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
