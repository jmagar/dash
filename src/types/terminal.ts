import { CacheCommand } from './cache';
import { SSHClient, SSHStream } from './ssh';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const socketio = require('socket.io');
export type IOServer = typeof socketio.Server;

export interface TerminalData {
  hostId: string;
  rows?: number;
  cols?: number;
}

export interface CommandData {
  hostId: string;
  command: string;
}

export interface ResizeData {
  rows: number;
  cols: number;
}

export interface CommandHistory {
  id: string;
  user_id: string;
  host_id: string;
  command: string;
  created_at: Date;
}

export interface CommandHistoryResponse {
  success: boolean;
  data?: (CommandHistory | CacheCommand)[];
  error?: string;
}

export interface TerminalEvents {
  init: (data: TerminalData) => void;
  data: (data: string) => void;
  resize: (data: ResizeData) => void;
  execute: (data: CommandData) => void;
  error: (message: string) => void;
  ready: () => void;
  close: () => void;
  disconnect: () => void;
}

export interface AuthenticatedSocket {
  user: {
    id: string;
    username: string;
    role: string;
  };
  emit<T extends keyof TerminalEvents>(event: T, ...args: Parameters<TerminalEvents[T]>): boolean;
  on<T extends keyof TerminalEvents>(event: T, listener: TerminalEvents[T]): this;
}

export interface TerminalState {
  sshClient: SSHClient | null;
  stream: SSHStream | null;
}

export interface TerminalNamespace {
  on(event: 'connection', listener: (socket: AuthenticatedSocket) => void): this;
}

export interface TerminalServer extends IOServer {
  of(nsp: string): TerminalNamespace;
}

export const convertToCache = (history: CommandHistory): CacheCommand => ({
  command: history.command,
  timestamp: history.created_at,
});
