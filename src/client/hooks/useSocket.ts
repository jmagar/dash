import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../types/socket.io';
import { config } from '../../server/config';

// Create a socket instance with our custom events
const createSocket = () =>
  io(config.server.websocketUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

// Global socket instance
let socket: ReturnType<typeof createSocket> | null = null;

export function useSocket() {
  const socketRef = useRef(socket);

  useEffect(() => {
    if (!socketRef.current) {
      // Create socket connection
      socketRef.current = createSocket();
      socket = socketRef.current;

      // Setup error handling
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });

      socket.on('disconnect', (reason) => {
        console.error('Socket disconnected:', reason);
      });
    }

    // Cleanup function
    return () => {
      // Don't actually close the socket on unmount
      // We want to keep it alive for other components
      // socket?.disconnect();
    };
  }, []);

  return socketRef.current;
}

// Export the raw socket for use outside of React components
export function getSocket() {
  return socket;
}

// Export a function to manually close the socket if needed
export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
