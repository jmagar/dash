import { configureStore, type Reducer } from '@reduxjs/toolkit';
import dockerReducer from './slices/dockerSlice';
import processReducer from './slices/processSlice';
import hostReducer from './slices/hostSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';
import type { RootState } from './storeTypes';

// Type assertion to help TypeScript understand the reducer types
const rootReducer = {
  docker: dockerReducer as Reducer<RootState['docker']>,
  process: processReducer as Reducer<RootState['process']>,
  host: hostReducer as Reducer<RootState['host']>,
  notification: notificationReducer as Reducer<RootState['notification']>,
  ui: uiReducer as Reducer<RootState['ui']>,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'host/updateHostStatus',
          'notification/updateNotification'
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'payload.startTime',
          'payload.endTime',
          'payload.createdAt',
          'payload.updatedAt',
          'payload.lastSeen',
          'meta.arg.createdAt',
          'meta.arg.updatedAt'
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'docker.containers.*.startTime',
          'process.processes.*.startTime',
          'host.hosts.*.createdAt',
          'host.hosts.*.updatedAt',
          'host.hosts.*.lastSeen',
          'notification.notifications.*.createdAt',
          'notification.notifications.*.updatedAt',
          'notification.notifications.*.readAt'
        ],
      },
    }),
});

// Export types
export type { RootState };
export type AppDispatch = typeof store.dispatch;
