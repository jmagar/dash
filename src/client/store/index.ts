import {
  configureStore,
  Middleware,
  isRejectedWithValue,
  MiddlewareAPI,
} from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import dockerReducer from './slices/dockerSlice';
import hostReducer from './slices/hostSlice';
import type { RootState, AppDispatch, MiddlewareDispatch } from './storeTypes';
import type { LogMetadata } from '../../types/logger';
import { apiErrorMiddleware } from '../middleware/apiErrorMiddleware';
import { logger } from '../utils/frontendLogger';

/**
 * Custom logging middleware for Redux actions
 */
const loggingMiddleware: Middleware<Record<string, never>, RootState, MiddlewareDispatch> =
  (_api: MiddlewareAPI<MiddlewareDispatch, RootState>) =>
    (next) =>
      (action) => {
        const metadata: LogMetadata = {
          component: 'Redux',
          action: typeof action === 'object' && action !== null && 'type' in action
        ? action.type as string
        : 'unknown',
        };

        if (process.env.NODE_ENV === 'development') {
          logger.debug('Dispatching action:', metadata);
        }

        return next(action);
      };

/**
 * Custom rejection tracking middleware
 */
const rejectionTrackingMiddleware: Middleware<Record<string, never>, RootState, MiddlewareDispatch> =
  (_api: MiddlewareAPI<MiddlewareDispatch, RootState>) =>
    (next) =>
      (action) => {
        if (isRejectedWithValue(action)) {
          const metadata: LogMetadata = {
            component: 'Redux',
            action: action.type,
            payload: action.payload,
            meta: action.meta,
          };
          logger.error('Redux action rejected:', metadata);
        }
        return next(action);
      };

/**
 * Redux store configuration with enhanced error handling and logging
 */
export const store = configureStore({
  reducer: {
    hosts: hostReducer,
    docker: dockerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'docker/fetchContainers/fulfilled',
          'hosts/updateConnection',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: [
          'payload.lastConnected',
          'meta.arg.timestamp',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'docker.containers.lastConnected',
          'hosts.connections.lastConnected',
        ],
      },
      // Enable immutability check in development
      immutableCheck: process.env.NODE_ENV === 'development',
      // Enable thunk middleware
      thunk: {
        extraArgument: undefined,
      },
    })
      .concat(
      apiErrorMiddleware as Middleware<Record<string, never>, RootState, MiddlewareDispatch>,
      loggingMiddleware,
      rejectionTrackingMiddleware,
      ),
  // Enable Redux DevTools in development
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Typed versions of useDispatch and useSelector hooks
 */
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
