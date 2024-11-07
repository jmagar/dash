import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { Container, Stack } from '../types';

export interface UseDockerUpdatesOptions {
  enabled?: boolean;
  onUpdate?: (data: Container[] | Stack[]) => void;
}

interface DockerUpdatesResult {
  data: Container[] | Stack[] | null;
  loading: boolean;
  error: string | null;
}

export const useDockerUpdates = (options: UseDockerUpdatesOptions = {}): DockerUpdatesResult => {
  const { enabled = true, onUpdate } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<Container[] | Stack[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const newSocket = io(`${process.env.REACT_APP_WS_URL}/docker`, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setLoading(false);
      setError(null);
    });

    newSocket.on('connect_error', (err) => {
      setError(`Failed to connect: ${err.message}`);
      setLoading(false);
    });

    newSocket.on('docker:update', (updatedData: Container[] | Stack[]) => {
      setData(updatedData);
      onUpdate?.(updatedData);
    });

    newSocket.on('error', (err) => {
      setError(`Socket error: ${err}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [enabled, onUpdate]);

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    socket.emit('docker:subscribe');

    return () => {
      socket.emit('docker:unsubscribe');
    };
  }, [socket, enabled]);

  return {
    data,
    loading,
    error,
  };
};

export default useDockerUpdates;
