import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client/build/esm/socket';
import { config } from '../config';
import { logger } from '../utils/frontendLogger';
import type { ServerToClientEvents, ClientToServerEvents } from '../../types/socket.io';

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(): SocketType {
  const socketRef = useRef<SocketType | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      try {
        const socket = io(config.websocketUrl, {
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          transports: ['websocket'],
          auth: {
            token: localStorage.getItem('token') || '',
          },
        });

        socket.on('connect', () => {
          logger.info('Socket connected');
        });

        socket.on('disconnect', () => {
          logger.info('Socket disconnected');
        });

        socket.on('connect_error', (error: unknown) => {
          logger.error('Socket connection error:', {
            error: error instanceof Error ? error.message : String(error),
          });
        });

        socket.on('reconnect_attempt', (...args: unknown[]) => {
          const attempt = typeof args[0] === 'number' ? args[0] : 0;
          logger.info('Socket reconnection attempt:', { attempt });
        });

        // Cast the socket to our custom type
        socketRef.current = socket as unknown as SocketType;
      } catch (error) {
        logger.error('Failed to initialize socket:', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  if (!socketRef.current) {
    throw new Error('Socket not initialized');
  }

  return socketRef.current;
}
