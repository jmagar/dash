import io from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket-events';
import { config } from './config';
import { logger } from './utils/frontendLogger';

// Create a typed socket instance
const socket = io<ServerToClientEvents, ClientToServerEvents>(config.websocketUrl, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket'],
});

// Connection events with proper typing
socket.on('connect', () => {
  logger.info('Socket connected:', { id: socket.id });
});

socket.on('disconnect', (reason: string) => {
  logger.info('Socket disconnected:', { reason });
});

socket.on('connect_error', (error: Error) => {
  logger.error('Socket connection error:', { 
    error: error.message,
    stack: error.stack 
  });
});

socket.on('error', (error: Error) => {
  logger.error('Socket error:', { 
    error: error.message,
    stack: error.stack 
  });
});

// Reconnection events
socket.io.on('reconnect', (attempt: number) => {
  logger.info('Socket reconnected:', { attempt });
});

socket.io.on('reconnect_attempt', (attempt: number) => {
  logger.info('Socket reconnection attempt:', { attempt });
});

socket.io.on('reconnect_error', (error: Error) => {
  logger.error('Socket reconnection error:', { 
    error: error.message,
    stack: error.stack 
  });
});

socket.io.on('reconnect_failed', () => {
  logger.error('Socket reconnection failed');
});

export { socket };
