import type { Host } from '../../../../types/models-shared';

export interface ConnectionState {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  error?: string;
  lastConnected?: Date;
}

export interface HostState {
  hosts: Record<string, Host>;
  selectedHostId: string | null;
  connections: Record<string, ConnectionState>;
  loading: boolean;
  error: string | null;
}

export interface HostConnectionUpdate {
  hostId: string;
  connectionState: ConnectionState;
}
