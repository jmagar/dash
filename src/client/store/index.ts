import { configureStore } from '@reduxjs/toolkit';

import hostReducer from './slices/hostSlice';

export const store = configureStore({
  reducer: {
    hosts: hostReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['hosts/updateHostStatus'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt', 'payload.lastSeen'],
        // Ignore these paths in the state
        ignoredPaths: [
          'hosts.hosts.*.createdAt',
          'hosts.hosts.*.updatedAt',
          'hosts.hosts.*.lastSeen',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
