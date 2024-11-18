import type { ThunkAction, Action } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import type { ProcessInfo } from '@/types/process';
import type { Host } from '@/types/host';
import type { Notification } from '@/types/notifications';
import type { DockerContainer } from '@/types/docker';
import type { store } from './store';

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Docker Types
export interface DockerState {
  containers: Record<string, DockerContainer>;
  selectedContainerId: string | null;
  loading: boolean;
  error: string | null;
}

// Process Types
export interface ProcessState {
  processes: Record<string, ProcessInfo>;
  selectedProcessId: string | null;
  loading: boolean;
  error: string | null;
}

// Host Types
export interface HostState {
  hosts: Record<string, Host>;
  selectedHostId: string | null;
  loading: boolean;
  error: string | null;
}

// Notification Types
export interface NotificationState {
  notifications: Record<string, Notification>;
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// UI Types
export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalContent: React.ReactNode | null;
}

// Root State Type
export interface RootStateType {
  docker: DockerState;
  process: ProcessState;
  host: HostState;
  notification: NotificationState;
  ui: UIState;
}
