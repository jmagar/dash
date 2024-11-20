import { useRef, useEffect } from 'react';

import io from 'socket.io-client';

import { logger } from '../utils/frontendLogger';

import type { SystemMetrics } from '../../types/metrics';
import type { Notification, DesktopNotification } from '../../types/notifications';
import type { ProcessInfo } from '../../types/process';


interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
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
  // Chat events
  'chat:send': (data: { content: string; role: 'system' | 'user' | 'assistant' }) => void;
}

export type TypedSocket = {
  emit: <Ev extends keyof ClientToServerEvents>(
    ev: Ev,
    ...args: Parameters<ClientToServerEvents[Ev]>
  ) => void;
  on: <Ev extends keyof ServerToClientEvents>(
    ev: Ev,
    listener: ServerToClientEvents[Ev]
  ) => void;
  off: <Ev extends keyof ServerToClientEvents>(
    ev: Ev,
    listener?: ServerToClientEvents[Ev]
  ) => void;
  once: <Ev extends keyof ServerToClientEvents>(
    ev: Ev,
    listener: ServerToClientEvents[Ev]
  ) => void;
  disconnect: () => void;
};

// Socket configuration
const SOCKET_CONFIG = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

// Event handler functions
const handleConnect = () => {
  logger.info('Socket connected');
};

const handleDisconnect = (reason: string) => {
  logger.warn('Socket disconnected', { reason });
};

const handleConnectError = (error: Error) => {
  logger.error('Socket connection error', { error: error.message });
};

// Create socket with proper typing
function createSocket(): TypedSocket {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const rawSocket = io(
    process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001',
    SOCKET_CONFIG
  );

  // Type assertion for the socket instance
  const socket = rawSocket as TypedSocket;

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleConnectError);

  return socket;
}

// Socket hook
export function useSocket(): TypedSocket | null {
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = createSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
}
