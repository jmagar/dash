import { Client as SSHClient } from 'ssh2';
import type { Host } from '../../../types/host';
import type { AgentState } from '../agent/agent.types';

/**
 * Host states throughout its lifecycle
 */
export enum HostState {
  UNINITIALIZED = 'uninitialized', // Initial state, no agent
  INSTALLING = 'installing',        // Agent being installed
  ACTIVE = 'active',               // Agent running and connected
  UNREACHABLE = 'unreachable',     // Can't connect via SSH or agent
  MAINTENANCE = 'maintenance',      // Under maintenance (e.g., updates)
  ERROR = 'error'                  // Error state
}

/**
 * SSH operations for bootstrap and emergency access
 */
export interface SSHOperations {
  connect(host: Host): Promise<SSHClient>;
  disconnect(hostId: string): Promise<void>;
  executeCommand(hostId: string, command: string): Promise<string>;
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
 * Host service configuration
 */
export interface HostServiceConfig {
  ssh: {
    timeout: number;
    retries: number;
    keepaliveInterval: number;
  };
  agent: {
    installTimeout: number;
    connectTimeout: number;
    defaultFeatures: string[];
  };
}

/**
 * Host service events
 */
export interface HostServiceEvents {
  'host:created': (host: Host) => void;
  'host:updated': (host: Host) => void;
  'host:deleted': (hostId: string) => void;
  'host:state': (hostId: string, state: HostState, previous: HostState) => void;
  'agent:installing': (hostId: string) => void;
  'agent:installed': (hostId: string, agent: AgentState) => void;
  'agent:error': (hostId: string, error: Error) => void;
}

/**
 * Host operation result
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
  restart(hostId: string): Promise<OperationResult>;
  killProcess(hostId: string, pid: number): Promise<OperationResult>;
  checkConnectivity(hostId: string): Promise<OperationResult<boolean>>;
}
