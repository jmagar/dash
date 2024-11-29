import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { AgentStatus } from '../../../types/agent-config';
import { z } from 'zod';

// Zod schema for agent info validation
export const agentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  status: z.nativeEnum(AgentStatus),
  lastSeen: z.date(),
  metadata: z.record(z.unknown()),
});

export interface AgentInfo {
  id: string;
  name: string;
  version: string;
  status: AgentStatus;
  lastSeen: Date;
  metadata: Record<string, unknown>;
}

export interface AgentState {
  info: AgentInfo;
  connection: WebSocket;
  lastSeen: number;
}

export interface AgentMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  timestamp: number;
}

export interface AgentServiceMetrics {
  totalAgents: number;
  connectedAgents: number;
  disconnectedAgents: number;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}
