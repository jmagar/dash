import type { Socket } from 'socket.io';
import type { TokenPayload } from './auth';

import { CacheCommand } from './cache';
import { SSHClient, SSHStream } from './ssh';

export interface TerminalData {
  cols: number;
  rows: number;
  hostId: string;
  cwd?: string;
  data?: string;
}

export interface CommandData {
  command: string;
  hostId: string;
}

export interface ResizeData {
  cols: number;
  rows: number;
}

export interface CommandHistory {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
  user_id: string;
  host_id: string;
  created_at: Date;
}

export interface CommandHistoryResponse {
  success: boolean;
  history: CommandHistory[];
  total: number;
  page: number;
  limit: number;
  data?: (CommandHistory | CacheCommand)[];
  error?: string;
}

export interface TerminalEvents {
  'terminal:data': (data: string) => void;
  'terminal:resize': (data: ResizeData) => void;
  'terminal:command': (data: CommandData) => void;
  'terminal:history': (hostId: string) => void;
  'terminal:execute': (data: CommandData) => void;
  'terminal:error': (message: string) => void;
  'terminal:ready': () => void;
  'terminal:close': () => void;
  disconnect: () => void;
}

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
  terminal?: {
    hostId: string;
    pid: number;
    rows: number;
    cols: number;
  };
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'terminal:data', listener: (data: string) => void): this;
  on(event: 'terminal:resize', listener: (data: ResizeData) => void): this;
}

export interface TerminalState {
  sshClient: SSHClient | null;
  stream: SSHStream | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

export const convertToCache = (history: CommandHistory): CacheCommand => ({
  command: history.command,
  timestamp: history.created_at,
});
