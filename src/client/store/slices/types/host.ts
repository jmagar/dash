import type { Host } from '../../../../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  lastConnected?: Date;
  error?: string;
}

export interface HostConnectionUpdate {
  hostId: number;
  connectionState: ConnectionState;
}

export interface HostState {
  hosts: Record<number, Host>;
  selectedHost: Host | null;
  loading: boolean;
  error: string | null;
  connections: Record<number, ConnectionState>;
}
