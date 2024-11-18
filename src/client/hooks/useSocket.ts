import { useRef, useEffect } from 'react';
import io from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket-events';
import { logger } from '../utils/frontendLogger';

type SocketType = ReturnType<typeof io>;

export function useSocket(): SocketType {
  const socketRef = useRef<SocketType | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const socket = io(process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      socket.on('connect', (...args: unknown[]) => {
        logger.info('Socket connected', { id: socket.id });
      });

      socket.on('disconnect', (...args: unknown[]) => {
        const [reason] = args;
        logger.warn('Socket disconnected', { reason });
      });

      socket.on('error', (...args: unknown[]) => {
        const [error] = args;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Socket error', { error: errorMessage });
      });

      socket.on('connect_error', (...args: unknown[]) => {
        const [error] = args;
        const errorObj = error as Error;
        logger.error('Socket connection error', { error: errorObj.message });
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // We know socketRef.current is not null here because it's initialized in the effect
  return socketRef.current!;
}
