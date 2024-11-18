import type { Socket } from 'socket.io-client/build/esm/socket';
import type { TokenPayload } from './auth';
import { CacheCommand } from './cache';
import { SSHClient, SSHStream } from './ssh';

export interface TerminalOptions {
  hostId: string;
  sessionId: string;
  cols: number;
  rows: number;
  cwd?: string;
  env?: Record<string, string>;
}

export interface TerminalSize {
  cols: number;
  rows: number;
}

export interface TerminalSession {
  id: string;
  hostId: string;
  pid: number;
  title: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface TerminalData {
  hostId: string;
  sessionId: string;
  data: string;
}

export interface TerminalResize extends TerminalSize {
  hostId: string;
  sessionId: string;
}

export interface TerminalExit {
  hostId: string;
  sessionId: string;
  code: number;
}

export interface TerminalEvents {
  'terminal:join': (data: { hostId: string; sessionId: string }) => void;
  'terminal:leave': (data: { hostId: string; sessionId: string }) => void;
  'terminal:data': (data: TerminalData) => void;
  'terminal:resize': (data: TerminalResize) => void;
  'terminal:exit': (data: TerminalExit) => void;
}

export type TerminalSocket = Socket<TerminalEvents>;

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
