import type { ThunkDispatch, AnyAction } from '@reduxjs/toolkit';

import type { DockerState } from './slices/types/docker';
import type { HostState } from './slices/types/host';

export interface RootState {
  docker: DockerState;
  hosts: HostState;
}

export type AppDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

export type MiddlewareDispatch = ThunkDispatch<RootState, undefined, AnyAction>;
