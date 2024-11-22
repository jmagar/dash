import { useRef, useEffect, useCallback, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import type { SystemMetrics } from '../../types/metrics';
import type { Notification, DesktopNotification } from '../../types/notifications';
import type { ProcessInfo } from '../../types/process';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../types/socket-events';
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
  reconnectInterval: 5000,
  onAuthenticated: () => {},
};

interface UseSocketReturn {
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
  const { token } = useAuth();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { hostId, autoReconnect, maxReconnectAttempts, reconnectInterval, onAuthenticated } = opts;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<SocketErrorType | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const handleConnect = useCallback(() => {
    setConnectionState('connected');
    setError(null);
    onAuthenticated();
  }, [onAuthenticated]);

  const handleDisconnect = useCallback((reason: string) => {
    setConnectionState('disconnected');
    if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.connect();
        }
      }, reconnectInterval);
    }
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval]);

  const handleError = useCallback((err: Error) => {
    setConnectionState('error');
    setError(isSocketError(err) ? err : createSocketError(err));
  }, []);

  const createSocket = useCallback(() => {
    try {
      const socket: TypedSocket = io({
        auth: { token },
        query: { hostId },
        transports: ['websocket'],
        reconnection: false,
      });

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleError);
      socket.on('error', handleError);

      socketRef.current = socket;
      return socket;
    } catch (error) {
      logger.error('Failed to create socket:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
      return null;
    }
  }, [hostId, token, handleConnect, handleDisconnect, handleError]);

  const disconnect = useCallback(() => {
    try {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionState('disconnected');
    } catch (error) {
      logger.error('Failed to disconnect:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
    }
  }, []);

  const emit = useCallback(<T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) => {
    if (!socketRef.current?.connected) {
      logger.warn('Socket not connected, cannot emit event:', { event });
      return;
    }
    try {
      (socketRef.current as TypedSocket).emit(event, ...args);
    } catch (error) {
      logger.error('Failed to emit event:', {
        error: error instanceof Error ? error.message : String(error),
        event,
        args
      });
    }
  }, []);

  const on = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    handler: ServerToClientEvents[T]
  ) => {
    if (!socketRef.current) return () => undefined;

    try {
      (socketRef.current as TypedSocket).on(event, handler);
      return () => {
        if (socketRef.current) {
          (socketRef.current as TypedSocket).off(event, handler);
        }
      };
    } catch (error) {
      logger.error('Failed to register event handler:', {
        error: error instanceof Error ? error.message : String(error),
        event
      });
      return () => undefined;
    }
  }, []);

  useEffect(() => {
    socketRef.current = createSocket();

    return () => {
      disconnect();
    };
  }, [createSocket, disconnect]);

  const reconnect = useCallback(() => {
    try {
      if (socketRef.current) {
        socketRef.current.connect();
      }
    } catch (error) {
      logger.error('Failed to reconnect:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
    }
  }, []);

  return {
    socket: socketRef.current,
    appSocket,
    connectionState,
    error,
    reconnect,
    disconnect,
    emit,
    on,
  };
}
