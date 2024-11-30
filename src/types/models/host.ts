/**
 * Host model type definitions
 */

export type HostStatus = 'online' | 'offline' | 'error' | 'installing';

export interface HostMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    rx: number;
    tx: number;
  };
}

export interface HostConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  useSyslog: boolean;
  metrics: {
    collectionInterval: number;
    retentionPeriod: number;
    includeIO: boolean;
    includeNetwork: boolean;
    includeExtended: boolean;
  };
}

export interface Host {
  id: string;
  friendlyName: string;
  hostname: string;
  port: number;
  username: string;
  status: HostStatus;
  os?: string;
  arch?: string;
  version?: string;
  metrics?: HostMetrics;
  config?: HostConfig;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}
