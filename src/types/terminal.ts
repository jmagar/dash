import { CacheCommand } from './cache';
import { SSHClient, SSHStream } from './ssh';
import type { AccessTokenPayloadDto, RefreshTokenPayloadDto } from './auth';
import type { Socket } from 'socket.io-client';

export interface TerminalOptions extends TerminalSize {
  hostId: string;
  sessionId: string;
  command?: string;
  args?: string[];
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
  data: (data: string) => void;
  error: (error: string) => void;
  exit: (code: number) => void;
  resize: (data: { cols: number; rows: number }) => void;
  command: (data: CommandData) => void;
}

export type TerminalSocket = typeof Socket & {
  emit: {
    (event: 'data', data: string): boolean;
    (event: 'error', error: string): boolean;
    (event: 'exit', code: number): boolean;
    (event: 'resize', data: { cols: number; rows: number }): boolean;
    (event: 'command', data: CommandData): boolean;
  };
  on: {
    (event: 'data', listener: (data: string) => void): void;
    (event: 'error', listener: (error: string) => void): void;
    (event: 'exit', listener: (code: number) => void): void;
    (event: 'resize', listener: (data: { cols: number; rows: number }) => void): void;
    (event: 'command', listener: (data: CommandData) => void): void;
  };
};

export interface CommandData {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  hostId: string;
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

export interface AuthenticatedSocket extends Omit<TerminalSocket, 'on'> {
  user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
  terminal?: {
    hostId: string;
    pid: number;
    rows: number;
    cols: number;
  };
  on: {
    (event: 'data', listener: (data: string) => void): void;
    (event: 'error', listener: (error: string) => void): void;
    (event: 'exit', listener: (code: number) => void): void;
    (event: 'resize', listener: (data: { cols: number; rows: number }) => void): void;
    (event: 'command', listener: (data: CommandData) => void): void;
    (event: 'disconnect', listener: () => void): void;
    (event: 'terminal:data', listener: (data: string) => void): void;
    (event: 'terminal:resize', listener: (data: { cols: number; rows: number }) => void): void;
  };
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
