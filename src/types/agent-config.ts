import { Server as SocketServer } from 'socket.io';

export enum AgentStatus {
  UNKNOWN = 'unknown',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface AgentInfo {
  id: string;
  hostname: string;
  ipAddress: string;
  osType: string;
  osVersion: string;
  agentVersion: string;
  labels?: Record<string, string>;
  capabilities: string[];
}

export interface AgentMetrics {
  timestamp: Date;
  system: {
    cpu: {
      usage: number;
      cores: number;
      loadAverage: number[];
    };
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
  };
  process: {
    count: number;
    active: number;
  };
}

export interface AgentCommand {
  id: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
}

export interface AgentCommandResult {
  id: string;
  status: 'success' | 'error';
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  duration: number;
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
  };
}

export interface AgentHeartbeat {
  agentId: string;
  timestamp: Date;
  loadAverage: number[];
  memoryUsage: number;
  diskUsage: number;
  cpuUsage: number;
  isHealthy: boolean;
  activeJobs: number;
  errorCount: number;
  uptimeSeconds: number;
}

// Socket.IO message types
export interface ServerToAgentEvents {
  command: (cmd: AgentCommand, callback: (response: { status: string }) => void) => void;
  ping: () => void;
}

export interface AgentToServerEvents {
  register: (info: AgentInfo) => void;
  metrics: (metrics: AgentMetrics) => void;
  commandResult: (result: AgentCommandResult) => void;
  heartbeat: (heartbeat: AgentHeartbeat) => void;
  error: (error: { code: string; message: string; details?: unknown }) => void;
}

// Declare global io instance
declare global {
  // eslint-disable-next-line no-var
  var io: SocketServer<AgentToServerEvents, ServerToAgentEvents>;
}
