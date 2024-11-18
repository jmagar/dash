import io from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket-events';
import { config } from './config';
import { logger } from './utils/frontendLogger';

// Create a socket instance with our custom events
const socket = io(config.websocketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on('connect', (...args: unknown[]) => {
  logger.info('Socket connected:', { id: socket.id });
});

socket.on('disconnect', (...args: unknown[]) => {
  const [reason] = args;
  logger.info('Socket disconnected:', { reason });
});

socket.on('connect_error', (...args: unknown[]) => {
  const [error] = args;
  const errorObj = error as Error;
  logger.error('Socket connection error:', { error: errorObj.message });
});

socket.on('error', (...args: unknown[]) => {
  const [error] = args;
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Socket error:', { error: errorMessage });
});

export { socket };
