/**
 * Transport type definitions
 */

export interface TransportConfig {
  type: 'file' | 'console' | 'socket';
  level: 'debug' | 'info' | 'warn' | 'error';
  format?: 'json' | 'text';
}

export interface FileTransportConfig extends TransportConfig {
  type: 'file';
  filename: string;
  maxSize?: number;
  maxFiles?: number;
  compress?: boolean;
}

export interface ConsoleTransportConfig extends TransportConfig {
  type: 'console';
  colorize?: boolean;
  timestamp?: boolean;
}

export interface SocketTransportConfig extends TransportConfig {
  type: 'socket';
  host: string;
  port: number;
  secure?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxRetries?: number;
}

export type AnyTransportConfig = 
  | FileTransportConfig 
  | ConsoleTransportConfig 
  | SocketTransportConfig;
