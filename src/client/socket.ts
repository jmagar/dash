import socketIO from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket-events';
import { config } from './config';
import { logger } from './utils/frontendLogger';
import { LoggingManager } from '../../../../../../../src/server/utils/logging/LoggingManager';

// Socket configuration
const socketConfig = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket'],
  // Align with server configuration
  pingTimeout: 60000,
  pingInterval: 25000
};

// Create socket instance
const socketInstance = socketIO(config.socketUrl, socketConfig);

// Error formatting helper
function formatError(error: unknown): { error: string; stack?: string } {
  if (error instanceof Error) {
    return {
      error: error.message,
      stack: error.stack
    };
  }
  return {
    error: String(error)
  };
}

// Basic socket events
function setupBasicEvents(): void {
  // Connection events
  socketInstance.on('connect', () => {
    const socketId = socketInstance.id;
    loggerLoggingManager.getInstance().();
  });

  // Disconnection events
  socketInstance.on('disconnect', () => {
    loggerLoggingManager.getInstance().();
  });

  // Error events
  socketInstance.on('connect_error', () => {
    loggerLoggingManager.getInstance().();
  });

  socketInstance.on('error', () => {
    loggerLoggingManager.getInstance().();
  });
}

// Reconnection events
function setupReconnectionEvents(): void {
  // Reconnection events using socket events
  socketInstance.on('reconnect', () => {
    loggerLoggingManager.getInstance().();
  });

  socketInstance.on('reconnect_attempt', () => {
    loggerLoggingManager.getInstance().();
  });

  socketInstance.on('reconnect_error', () => {
    loggerLoggingManager.getInstance().();
  });

  socketInstance.on('reconnect_failed', () => {
    loggerLoggingManager.getInstance().();
  });
}

// Initialize socket events
setupBasicEvents();
setupReconnectionEvents();

// Type-safe event emitter with explicit typing
function emit<T extends keyof ClientToServerEvents>(
  event: T,
  ...args: Parameters<ClientToServerEvents[T]>
): void {
  // Type assertion for the emit method
  (socketInstance as unknown as {
    emit(event: T, ...args: Parameters<ClientToServerEvents[T]>): void;
  }).emit(event, ...args);
}

// Type-safe event listener with explicit typing
function on<T extends keyof ServerToClientEvents>(
  event: T,
  handler: ServerToClientEvents[T]
): void {
  // Type assertion for the on method
  (socketInstance as unknown as {
    on(event: T, handler: ServerToClientEvents[T]): void;
  }).on(event, handler);
}

// Type-safe event unsubscriber with explicit typing
function off<T extends keyof ServerToClientEvents>(
  event: T,
  handler?: ServerToClientEvents[T]
): void {
  // Type assertion for the off method
  (socketInstance as unknown as {
    off(event: T, handler?: ServerToClientEvents[T]): void;
  }).off(event, handler);
}

// Export the socket instance and helper functions
export const socket = socketInstance;
export {
  emit,
  on,
  off
};

