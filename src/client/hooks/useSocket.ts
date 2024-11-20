import { useRef, useEffect, useCallback } from 'react';
import { default as io } from 'socket.io-client';
import type { SystemMetrics } from '../../types/metrics';
import type { Notification, DesktopNotification } from '../../types/notifications';
import type { ProcessInfo } from '../../types/process';

import { logger } from '../utils/frontendLogger';

// Socket error types
type ErrorType = 'ConnectionError' | 'AuthError' | 'UnknownError';

interface BaseSocketError {
  message: string;
  description?: string;
  code?: string;
}

interface ConnectionError extends BaseSocketError {
  type: 'ConnectionError';
}

interface AuthError extends BaseSocketError {
  type: 'AuthError';
}

interface UnknownError extends BaseSocketError {
  type: 'UnknownError';
}

type SocketError = ConnectionError | AuthError | UnknownError;
type SocketErrorType = SocketError | Error;

// Type guard for SocketError
function isSocketError(error: SocketErrorType): error is SocketError {
  return (error as SocketError).type !== undefined;
}

// Error factory
function createSocketError(error: Error): SocketError {
  return {
    type: 'UnknownError',
    message: error.message,
    description: error.stack,
  };
}

// Event handler types
type ServerToClientEventsMap = {
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: SocketErrorType) => void;
  error: (error: SocketErrorType) => void;
  reconnect: (attemptNumber: number) => void;
  reconnect_attempt: (attemptNumber: number) => void;
  reconnect_error: (error: SocketErrorType) => void;
  reconnect_failed: () => void;
  // Process events
  'process:list': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  'process:update': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:error': (data: { hostId: string; error: string }) => void;
  'process:kill:success': () => void;
  'process:kill:error': (error: string) => void;
  'process:metrics': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  // Notification events
  'notification:created': (notification: Notification) => void;
  'notification:updated': (notification: Notification) => void;
  'notification:deleted': (notificationId: string) => void;
  'notification:desktop': (notification: DesktopNotification) => void;
  // Metrics events
  'metrics:update': (data: { hostId: string; metrics: SystemMetrics }) => void;
  'metrics:error': (data: { hostId: string; error: string }) => void;
  // Terminal events
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:exit': (data: { hostId: string; sessionId: string; code: number }) => void;
  // Host events
  'host:updated': (data: { hostId: string; host: Record<string, unknown> }) => void;
};

type ClientToServerEventsMap = {
  // Process events
  'process:monitor': (data: { hostId: string }) => void;
  'process:unmonitor': (data: { hostId: string }) => void;
  'process:kill': (data: { hostId: string; pid: number; signal?: string }) => void;
  // Metrics events
  'metrics:subscribe': (data: { hostId: string }) => void;
  'metrics:unsubscribe': (data: { hostId: string }) => void;
  // Terminal events
  'terminal:join': (data: { hostId: string; sessionId: string; command: string }) => void;
  'terminal:leave': (data: { hostId: string; sessionId: string }) => void;
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:resize': (data: { hostId: string; sessionId: string; cols: number; rows: number }) => void;
  // Host events
  'host:connect': (data: { hostId: string; force?: boolean }, callback?: (response: { error?: string }) => void) => void;
  'host:disconnect': (data: { hostId: string; force?: boolean }, callback?: (response: { error?: string }) => void) => void;
  // Chat events
  'chat:send': (data: { content: string; role: 'system' | 'user' | 'assistant' }) => void;
};

export type TypedSocket = ReturnType<typeof io>;

// Socket configuration
const SOCKET_CONFIG = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  auth: {
    token: localStorage.getItem('token') || '',
  },
};

// Event handler functions
const handleConnect = (...args: unknown[]) => {
  logger.info('Socket connected');
};

const handleDisconnect = (...args: unknown[]) => {
  const [reason] = args as [string];
  logger.info(`Socket disconnected: ${reason}`);
};

const handleConnectError = (...args: unknown[]) => {
  const [error] = args as [SocketErrorType];
  logger.error('Socket connection error', { error: error.message || String(error) });
};

const handleError = (...args: unknown[]) => {
  const [error] = args as [SocketErrorType];
  logger.error('Socket error', { error: error.message || String(error) });
};

const handleReconnect = (...args: unknown[]) => {
  const [attemptNumber] = args as [number];
  logger.info(`Socket reconnected after ${attemptNumber} attempts`);
};

const handleReconnectAttempt = (...args: unknown[]) => {
  const [attemptNumber] = args as [number];
  logger.info(`Socket reconnection attempt ${attemptNumber}`);
};

const handleReconnectError = (...args: unknown[]) => {
  const [error] = args as [SocketErrorType];
  logger.error('Socket reconnection error', { error: error.message || String(error) });
};

const handleReconnectFailed = (...args: unknown[]) => {
  logger.error('Socket reconnection failed');
};

// Socket hook
export function useSocket(): TypedSocket | null {
  const socketRef = useRef<TypedSocket | null>(null);

  const createSocket = useCallback((): TypedSocket => {
    const socket = io(process.env.REACT_APP_SOCKET_URL || '', SOCKET_CONFIG);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('error', handleError);
    socket.on('reconnect', handleReconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);
    socket.on('reconnect_error', handleReconnectError);
    socket.on('reconnect_failed', handleReconnectFailed);

    return socket;
  }, []);

  useEffect(() => {
    socketRef.current = createSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [createSocket]);

  return socketRef.current;
}
