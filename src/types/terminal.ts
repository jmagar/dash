import { Socket } from 'socket.io/dist/socket';

import { CacheCommand } from './cache';
import { SSHClient, SSHStream } from './ssh';

export interface TerminalData {
  hostId: string;
  rows?: number;
  cols?: number;
  data?: string;
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
  'terminal:data': (data: TerminalData) => void;
  'terminal:resize': (data: ResizeData) => void;
  'terminal:execute': (data: CommandData) => void;
  'terminal:error': (message: string) => void;
  'terminal:ready': () => void;
  'terminal:close': () => void;
  disconnect: () => void;
}

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
    username: string;
    role: string;
  };
  on(event: 'disconnect', listener: () => void): this;
  on(event: 'terminal:data', listener: (data: TerminalData) => void): this;
  on(event: 'terminal:resize', listener: (data: TerminalData) => void): this;
}

export interface TerminalState {
  sshClient: SSHClient | null;
  stream: SSHStream | null;
}

export const convertToCache = (history: CommandHistory): CacheCommand => ({
  command: history.command,
  timestamp: history.created_at,
});
