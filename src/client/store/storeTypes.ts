import type { ThunkAction, Action } from '@reduxjs/toolkit';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import type { ProcessInfo, ProcessStats } from '../../types/process';
import type { Host } from '../../types/host';
import type { NotificationEntity } from '../../types/notifications';
import type { DockerContainer, ContainerState } from '../../types/docker';
import type { store } from './store';

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

// Docker Types
export interface DockerState {
  containers: DockerContainer[];
  selectedContainerId: string | null;
  loading: boolean;
  error: string | null;
}

export interface ContainerUpdate {
  containerId: string;
  updates: Partial<DockerContainer>;
}

export { ContainerState };

// Process Types
export interface ProcessState {
  processes: ProcessInfo[];
  stats: ProcessStats | null;
  selectedProcessId: string | null;
  loading: boolean;
  error: string | null;
}

// Host Types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'disconnecting' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  error?: string;
}

export interface HostConnectionUpdate {
  hostId: string;
  state: ConnectionStatus;
}

export interface HostState {
  hosts: Record<string, Host>;
  selectedHostId: string | null;
  loading: boolean;
  error: string | null;
  connections: Record<string, ConnectionState>;
}

// Notification Types
export interface NotificationState {
  notifications: NotificationEntity[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// UI Types
export interface UIState {
  loading: boolean;
  theme: ThemeMode;
  sidebarOpen: boolean;
  modalOpen: boolean;
  modalContent: React.ReactNode | null;
}

// Root State Type
export interface RootState {
  docker: DockerState;
  process: ProcessState;
  host: HostState;
  notification: NotificationState;
  ui: UIState;
}

// Redux Types
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

// Redux Hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
