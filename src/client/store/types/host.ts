import type { Host } from '../../../types/models-shared';

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'disconnecting' | 'error';

export interface HostConnectionUpdate {
  hostId: number;
  state: ConnectionState;
}

export interface HostState {
  hosts: Host[];
  selectedHost: Host | null;
  connections: Record<number, ConnectionState>;
  loading: boolean;
  error: string | null;
}
