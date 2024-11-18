import { configureStore } from '@reduxjs/toolkit';
import dockerReducer from './slices/dockerSlice';
import processReducer from './slices/processSlice';
import hostReducer from './slices/hostSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    docker: dockerReducer,
    process: processReducer,
    host: hostReducer,
    notification: notificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredActions: ['payload.startTime', 'payload.endTime', 'payload.createdAt', 'payload.updatedAt'],
        ignoredPaths: ['docker.containers.startTime', 'process.processes.startTime'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
