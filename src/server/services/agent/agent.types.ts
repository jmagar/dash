import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { AgentStatus } from '../../../types/agent-config';
import type { AgentInfo, AgentMetrics } from '../../../types/socket-events';

export interface AgentState {
  id: string;
  info: AgentInfo;
  lastSeen: Date;
  metrics?: AgentMetrics;
  status: AgentStatus;
  connection: WebSocket | Socket;
  connectionType: 'ws' | 'socketio';
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
