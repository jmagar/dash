import socketIO from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useCallback, useEffect, useRef, useState } from 'react';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface BaseEvent<T = unknown> {
  type: string;
  payload: T;
}

interface ServerToClientEvents {
  connect: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
  message: (event: BaseEvent<string>) => void;
  notification: (event: BaseEvent<unknown>) => void;
}

interface ClientToServerEvents {
  message: (event: BaseEvent<string>) => void;
  notification: (event: BaseEvent<unknown>) => void;
}

interface SocketMethods {
  connected: boolean;
  on<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): InstanceType<typeof Socket>;
  off<E extends keyof ServerToClientEvents>(event: E, listener: ServerToClientEvents[E]): InstanceType<typeof Socket>;
  emit<E extends keyof ClientToServerEvents>(event: E, ...args: Parameters<ClientToServerEvents[E]>): boolean;
  connect(): InstanceType<typeof Socket>;
  disconnect(): InstanceType<typeof Socket>;
}

type SocketInstance = ReturnType<typeof socketIO> & SocketMethods;

interface SocketHookReturn {
  readonly socket: SocketInstance | null;
  readonly connectionState: ConnectionState;
  readonly connect: () => void;
  readonly disconnect: () => void;
  readonly emit: <T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) => void;
  readonly on: <T extends keyof ServerToClientEvents>(
    event: T,
    callback: ServerToClientEvents[T]
  ) => () => void;
}

function isConnected(socket: SocketInstance | null): socket is SocketInstance {
  return socket !== null && socket.connected;
}

export function useSocket(url: string): SocketHookReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<SocketInstance | null>(null);

  const connect = useCallback((): void => {
    if (isConnected(socketRef.current)) {
      console.warn('Socket already connected');
      return;
    }

    try {
      const socket = socketIO(url, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }) as SocketInstance;

      const handleConnect = () => {
        setConnectionState('connected');
      };

      const handleDisconnect = () => {
        setConnectionState('disconnected');
      };

      const handleError = (error: Error) => {
        console.error('Socket error:', error);
        setConnectionState('error');
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('error', handleError);

      socketRef.current = socket;
      socket.connect();
      setConnectionState('connecting');

    } catch (error) {
      console.error('Socket connection error:', error instanceof Error ? error.message : String(error));
      setConnectionState('error');
    }
  }, [url]);

  const disconnect = useCallback((): void => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn('No socket connection to disconnect');
      return;
    }

    try {
      socket.disconnect();
      socketRef.current = null;
      setConnectionState('disconnected');
    } catch (error) {
      console.error('Socket disconnect error:', error instanceof Error ? error.message : String(error));
      setConnectionState('error');
    }
  }, []);

  const emit = useCallback(<T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ): void => {
    const socket = socketRef.current;
    if (!isConnected(socket)) {
      console.warn('Cannot emit: socket not connected');
      return;
    }

    try {
      socket.emit(event, ...args);
    } catch (error) {
      console.error(`Socket emit error for event ${String(event)}:`, error instanceof Error ? error.message : String(error));
    }
  }, []);

  const on = useCallback(<T extends keyof ServerToClientEvents>(
    event: T,
    callback: ServerToClientEvents[T]
  ): (() => void) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn('Cannot add listener: socket not initialized');
      return () => undefined;
    }

    socket.on(event, callback);
    return () => {
      if (socket) {
        socket.off(event, callback);
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      const socket = socketRef.current;
      if (isConnected(socket)) {
        disconnect();
      }
    };
  }, [connect, disconnect, url]);

  return {
    socket: socketRef.current,
    connectionState,
    connect,
    disconnect,
    emit,
    on,
  };
}
