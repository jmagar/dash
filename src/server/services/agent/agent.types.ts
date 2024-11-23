import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { AgentStatus } from '../../../types/agent-config';
import { z } from 'zod';

// Zod schema for agent info validation
export const agentInfoSchema = z.object({
  id: z.string(),
  hostname: z.string(),
  platform: z.string(),
  version: z.string(),
  arch: z.string(),
  status: z.nativeEnum(AgentStatus),
  lastSeen: z.date(),
  metrics: z.record(z.number()).optional(),
});

export type AgentInfo = z.infer<typeof agentInfoSchema>;

export interface AgentState {
  info: AgentInfo;
  connection: WebSocket | Socket;
  connectionType: 'ws' | 'socketio';
  lastHeartbeat: Date;
  status: AgentStatus;
}

export interface AgentCommand {
  id: string;
  command: string;
  args?: string[];
  timeout?: number;
}

export interface InstallOptions {
  version: string;
  config: {
    server_url: string;
    agent_id: string;
    labels?: Record<string, string>;
  };
}

export interface SystemInfo {
  os: 'windows' | 'linux';
  arch: 'x64' | 'arm64' | 'arm';
}

export interface AgentMetrics {
  agentId: string;
  metrics: {
    cpu?: number;
    memory?: number;
    disk?: number;
    [key: string]: number | undefined;
  };
  timestamp?: Date;
}

export interface ICacheService {
  del(key: string): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  clear(): Promise<void>;
}

export interface AgentServiceMetrics {
  operationCount: number;
  errorCount: number;
  activeAgents: number;
  lastError?: Error & { timestamp?: string };
  uptime: number;
}
