import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { AgentStatus, AgentInfo, AgentMetrics, AgentHeartbeat } from '../../../types/agent-config';
import { z } from 'zod';

// Enhanced validation schema for agent info
export const agentInfoSchema = z.object({
  id: z.string().uuid(),
  hostname: z.string().min(1),
  ipAddress: z.string().ip(),
  osType: z.enum(['linux', 'windows', 'darwin']),
  osVersion: z.string().min(1),
  agentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  labels: z.record(z.string()).optional(),
  capabilities: z.array(z.string())
});

// Strongly typed cache interface
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

// Enhanced agent state tracking
export interface AgentState {
  info: AgentInfo;
  status: AgentStatus;
  socket: WebSocket | Socket;
  lastHeartbeat?: AgentHeartbeat;
  lastMetrics?: AgentMetrics;
  lastSeen: Date;
  connectionAttempts: number;
  errors: Array<{
    timestamp: Date;
    message: string;
    code?: string;
  }>;
}

// Service metrics with strict typing
export interface AgentServiceMetrics {
  totalAgents: number;
  activeAgents: number;
  disconnectedAgents: number;
  erroredAgents: number;
  averageResponseTime: number;
  totalCommandsExecuted: number;
  failedCommands: number;
  averageHeartbeatLatency: number;
}

// Protocol message types with discriminated unions
export type AgentMessage = 
  | { type: 'register'; payload: AgentInfo }
  | { type: 'heartbeat'; payload: AgentHeartbeat }
  | { type: 'metrics'; payload: AgentMetrics }
  | { type: 'error'; payload: { code: string; message: string; details?: unknown } };

// Result types for agent operations
export type AgentOperationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { message: string; code?: string } };

// Validation functions
export const validateAgentInfo = (info: unknown): AgentOperationResult<AgentInfo> => {
  try {
    const validatedInfo = agentInfoSchema.parse(info);
    return { success: true, data: validatedInfo };
  } catch (error) {
    return { 
      success: false, 
      error: { 
        message: 'Invalid agent info', 
        code: 'VALIDATION_ERROR' 
      } 
    };
  }
};
