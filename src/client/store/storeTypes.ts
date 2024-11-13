import type { ThunkAction, Action, Dispatch } from '@reduxjs/toolkit';

import type { DockerState } from './slices/types/docker';
import type { HostState } from './slices/types/host';

/**
 * Root state type combining all slice states
 */
export interface RootState {
  hosts: HostState;
  docker: DockerState;
}

/**
 * Type for Redux Thunks
 */
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

/**
 * Type for store dispatch
 */
export type AppDispatch = Dispatch<Action<string>> &
  ((action: AppThunk) => Promise<void>);

/**
 * Type for middleware dispatch
 */
export type MiddlewareDispatch = Dispatch<Action<string>>;
