import { Client as SSHClient } from 'ssh2';
import type { QueryResult } from 'pg';
import type { Host as BaseHost } from '../../../types/host';
import type { AgentState } from '../agent/agent.types';

/**
 * Host states throughout its lifecycle
 */
export enum HostState {
  UNINITIALIZED = 'offline',    // Initial state, no agent
  INSTALLING = 'installing',    // Agent being installed
  ACTIVE = 'online',           // Agent running and connected
  UNREACHABLE = 'offline',     // Can't connect via SSH or agent
  MAINTENANCE = 'offline',      // Under maintenance
  ERROR = 'error'             // Error state
}

/**
 * Host operating system
 */
export type HostOS = 'linux' | 'windows' | 'darwin';

/**
 * Extended host interface
 */
export interface ExtendedHost extends BaseHost {
  os: HostOS;
  state: HostState;
}

/**
 * Database interface
 */
export interface Database {
  query<T = unknown>(text: string, values: unknown[]): Promise<QueryResult<T>>;
}

/**
 * Host creation request
 */
export interface CreateHostRequest {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  environment?: string;
  tags?: string[];
  os: HostOS;
}

/**
 * Host update request
 */
export interface UpdateHostRequest {
  name?: string;
  hostname?: string;
  port?: number;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  environment?: string;
  tags?: string[];
  os?: HostOS;
}

/**
 * System information
 */
export interface SystemInfo {
  os: HostOS;
  arch: string;
  version: string;
  hostname: string;
  platform: string;
}

/**
 * Agent installer interface
 */
export interface AgentInstaller {
  install(host: ExtendedHost, ssh: SSHClient, options: InstallOptions): Promise<void>;
  uninstall(host: ExtendedHost, ssh: SSHClient): Promise<void>;
  upgrade(host: ExtendedHost, ssh: SSHClient, version: string): Promise<void>;
}

/**
 * Host service configuration
 */
export interface HostServiceConfig {
  ssh: {
    timeout: number;
    retries: number;
    keepaliveInterval: number;
  };
  agent: {
    serverUrl: string;
    installTimeout: number;
    connectTimeout: number;
    defaultFeatures: string[];
  };
}

/**
 * Operation result with host state
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: Error;
  state: HostState;
}

/**
 * Emergency operations when agent is unavailable
 */
export interface EmergencyOperations {
  restart(): Promise<void>;
  killProcess(pid: number): Promise<void>;
  checkConnectivity(): Promise<boolean>;
}

/**
 * Agent installation options
 */
export interface InstallOptions {
  version?: string;
  config?: {
    serverUrl: string;
    features: string[];
    labels?: Record<string, string>;
  };
  timeout?: number;
}

/**
 * Host service events
 */
export interface HostServiceEvents {
  'host:created': (host: ExtendedHost) => void;
  'host:updated': (host: ExtendedHost) => void;
  'host:deleted': (hostId: string) => void;
  'host:state': (hostId: string, state: HostState, previous: HostState) => void;
  'agent:installing': (hostId: string) => void;
  'agent:installed': (hostId: string, agent: AgentState) => void;
  'agent:error': (hostId: string, error: Error) => void;
}

/**
 * Map host state to status
 */
export function mapStateToStatus(state: HostState): BaseHost['status'] {
  switch (state) {
    case HostState.ACTIVE:
      return 'online';
    case HostState.ERROR:
      return 'error';
    case HostState.INSTALLING:
      return 'installing';
    default:
      return 'offline';
  }
}

/**
 * Map status to host state
 */
export function mapStatusToState(status: BaseHost['status']): HostState {
  switch (status) {
    case 'online':
      return HostState.ACTIVE;
    case 'error':
      return HostState.ERROR;
    case 'installing':
      return HostState.INSTALLING;
    default:
      return HostState.UNREACHABLE;
  }
}
