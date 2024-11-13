import { Client } from 'ssh2';

import type { Host } from '../../types/models-shared';

export interface ConnectionConfig {
  connectionTimeout: number;
  keepAliveInterval: number;
  keepAliveCountMax: number;
  maxRetries: number;
  retryDelay: number;
  maxConnections: number;
  idleTimeout: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  reconnectAttempts: number;
  averageConnectTime: number;
}

export interface ConnectionState {
  isActive: boolean;
  lastUsed: number;
  retryCount: number;
  lastError?: Error;
  metrics: {
    connectTime: number;
    reconnectAttempts: number;
    failedAttempts: number;
  };
}

export interface PooledConnection {
  client: Client;
  host: Host;
  state: ConnectionState;
}

export interface ConnectionEvents {
  connected: (hostId: string) => void;
  disconnected: (hostId: string) => void;
  error: (hostId: string, error: Error) => void;
  retry: (hostId: string, attempt: number) => void;
  timeout: (hostId: string) => void;
}

export interface ConnectionPool {
  getConnection(host: Host): Promise<Client>;
  releaseConnection(hostId: string): Promise<void>;
  closeConnection(hostId: string): Promise<void>;
  getMetrics(): ConnectionMetrics;
}
