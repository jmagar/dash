import { Client as SSHClient } from 'ssh2';
import type { QueryResult } from 'pg';
import type { Host as BaseHost } from '../../../types/host';
import type { AgentState } from '../agent/agent.types';
import type { EmergencyOperations, OperationResult as EmergencyOperationResult } from './emergency/types';
import { ServiceStatus } from '../../../types/status';

/**
 * Host states throughout its lifecycle
 */
export enum HostState {
  UNINITIALIZED = ServiceStatus.INACTIVE,    // Initial state, no agent
  INSTALLING = ServiceStatus.STARTING,       // Agent being installed
  ACTIVE = ServiceStatus.ACTIVE,            // Agent running and connected
  UNREACHABLE = ServiceStatus.INACTIVE,     // Can't connect via SSH or agent
  MAINTENANCE = ServiceStatus.INACTIVE,      // Under maintenance
  ERROR = ServiceStatus.ERROR              // Error state
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
export function mapStateToStatus(state: HostState): ServiceStatus {
  switch (state) {
    case HostState.ACTIVE:
      return ServiceStatus.ACTIVE;
    case HostState.ERROR:
      return ServiceStatus.ERROR;
    case HostState.INSTALLING:
      return ServiceStatus.STARTING;
    default:
      return ServiceStatus.INACTIVE;
  }
}

/**
 * Map status to host state
 */
export function mapStatusToState(status: ServiceStatus): HostState {
  switch (status) {
    case ServiceStatus.ACTIVE:
      return HostState.ACTIVE;
    case ServiceStatus.ERROR:
      return HostState.ERROR;
    case ServiceStatus.STARTING:
      return HostState.INSTALLING;
    default:
      return HostState.UNREACHABLE;
  }
}
