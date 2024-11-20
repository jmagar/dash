import { useRef, useEffect, useCallback, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import type { SystemMetrics } from '../../types/metrics';
import type { Notification, DesktopNotification } from '../../types/notifications';
import type { ProcessInfo } from '../../types/process';
import { useAuth } from './useAuth';
import { logger } from '../utils/frontendLogger';
import { socket as appSocket } from '../socket';

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

// Connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

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
interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  error: (error: Error) => void;
  reconnect: (attemptNumber: number) => void;
  reconnect_attempt: (attemptNumber: number) => void;
  reconnect_error: (error: Error) => void;
  reconnect_failed: () => void;
  // Process events
  'process:list': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  'process:update': (data: { hostId: string; process: ProcessInfo }) => void;
  'process:error': (data: { hostId: string; error: string }) => void;
  'process:kill:success': () => void;
  'process:kill:error': (error: string) => void;
  'process:metrics': (data: { hostId: string; processes: ProcessInfo[] }) => void;
  // Metrics events
  'metrics:update': (data: { hostId: string; metrics: SystemMetrics }) => void;
  'metrics:error': (data: { hostId: string; error: string }) => void;
  // Terminal events
  'terminal:data': (data: { hostId: string; sessionId: string; data: string }) => void;
  'terminal:exit': (data: { hostId: string; sessionId: string; code: number }) => void;
  // Host events
  'host:updated': (data: { hostId: string; host: Record<string, unknown> }) => void;
}

interface ClientToServerEvents {
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
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  token: string;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData>;

interface UseSocketOptions {
  hostId?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onAuthenticated?: () => void;
}

const DEFAULT_OPTIONS: Required<UseSocketOptions> = {
  hostId: '',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 1000,
  onAuthenticated: () => undefined,
};

export interface UseSocketReturn {
  socket: TypedSocket | null;
  appSocket: TypedSocket;
  connectionState: ConnectionState;
  error: SocketErrorType | null;
  reconnect: () => void;
  disconnect: () => void;
  emit: <T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) => void;
  on: <T extends keyof ServerToClientEvents>(
    event: T,
    handler: ServerToClientEvents[T]
  ) => () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const {
    hostId,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    onAuthenticated
  } = opts;

  const socketRef = useRef<TypedSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<SocketErrorType | null>(null);
  const { token } = useAuth();
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const handleConnect = useCallback(() => {
    logger.info('Host socket connected', { hostId });
    setConnectionState('connected');
    setError(null);
    reconnectAttemptsRef.current = 0;
    onAuthenticated();
  }, [hostId, onAuthenticated]);

  const handleDisconnect = useCallback((reason: string) => {
    logger.info(`Host socket disconnected: ${reason}`, { hostId });
    setConnectionState('disconnected');

    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        createSocket();
      }, reconnectInterval * Math.pow(2, reconnectAttemptsRef.current));
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval, hostId]);

  const handleError = useCallback((socketError: Error) => {
    const error = isSocketError(socketError) ? socketError : createSocketError(socketError);
    logger.error('Host socket error', {
      hostId,
      error: error.message,
      description: error.description,
    });
    setError(error);
    setConnectionState('error');
  }, [hostId]);

  const createSocket = useCallback(() => {
    if (!hostId) return null;

    const socket = io(`${process.env.REACT_APP_AGENT_WS_URL}/host/${hostId}`, {
      transports: ['websocket'],
      reconnection: false, // We handle reconnection manually
      auth: {
        token,
      },
    }) as TypedSocket;

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleError);
    socket.on('error', handleError);

    return socket;
  }, [hostId, token, handleConnect, handleDisconnect, handleError]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    reconnectAttemptsRef.current = 0;
    socketRef.current = createSocket();
  }, [createSocket]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  const emit = useCallback(<T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) => {
    if (!socketRef.current?.connected) {
      logger.warn('Socket not connected, cannot emit event:', { event });
      return;
    }
    socketRef.current.emit(event, ...args);
  }, []);

  const on = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    handler: ServerToClientEvents[T]
  ) => {
    if (!socketRef.current) return () => undefined;

    socketRef.current.on(event, handler);
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, handler);
      }
    };
  }, []);

  useEffect(() => {
    socketRef.current = createSocket();

    return () => {
      disconnect();
    };
  }, [createSocket, disconnect]);

  return {
    socket: socketRef.current,
    appSocket: appSocket as TypedSocket,
    connectionState,
    error,
    reconnect,
    disconnect,
    emit,
    on,
  };
}
