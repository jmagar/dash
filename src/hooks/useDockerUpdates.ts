import { useEffect, useState, useCallback } from 'react';
import { io as socketIo, Socket } from 'socket.io-client';

import { getContainers, getStacks } from '../api/docker';
import type { Container, Stack } from '../types';
import { logger } from '../utils/logger';

export interface UseDockerUpdatesOptions {
  enabled?: boolean;
  type?: 'containers' | 'stacks';
}

interface DockerUpdatesResult {
  data: Container[] | Stack[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const useDockerUpdates = (options: UseDockerUpdatesOptions = {}): DockerUpdatesResult => {
  const { enabled = true, type = 'containers' } = options;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<Container[] | Stack[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await (type === 'containers' ? getContainers() : getStacks());
      if (result.success && result.data) {
        setData(result.data);
        logger.info(`Successfully fetched ${type}`, { count: result.data.length });
      } else {
        const errorMsg = `Failed to fetch ${type}`;
        setError(result.error || errorMsg);
        logger.error(errorMsg, {
          type,
          errorDetails: result.error,
        });
      }
    } catch (err) {
      const errorMsg = `Failed to fetch ${type}`;
      setError(err instanceof Error ? err.message : errorMsg);
      logger.error(errorMsg, {
        type,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const newSocket = socketIo(`${process.env.REACT_APP_WS_URL}/docker`, {
      transports: ['websocket'],
      query: { type },
    });

    newSocket.on('connect', () => {
      logger.info('Docker socket connected', { type });
      setLoading(false);
      setError(null);
      void refetch();
    });

    newSocket.on('connect_error', (err) => {
      const errorMsg = `Failed to connect to docker socket: ${err.message}`;
      setError(errorMsg);
      logger.error(errorMsg, {
        type,
        errorDetails: err,
      });
      setLoading(false);
    });

    newSocket.on('docker:update', (updatedData: Container[] | Stack[]) => {
      if (updatedData) {
        setData(updatedData);
        logger.info(`Received docker ${type} update`, {
          count: updatedData.length,
        });
      }
    });

    newSocket.on('error', (err) => {
      const errorMsg = `Socket error for ${type}`;
      logger.error(errorMsg, {
        type,
        errorDetails: err,
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      logger.info('Docker socket disconnected', { type });
    };
  }, [enabled, type, refetch]);

  useEffect(() => {
    if (!socket || !enabled) {
      return;
    }

    socket.emit('docker:subscribe', { type });
    logger.info('Subscribed to docker updates', { type });

    return () => {
      socket.emit('docker:unsubscribe', { type });
      logger.info('Unsubscribed from docker updates', { type });
    };
  }, [socket, enabled, type]);

  return {
    data,
    loading,
    error,
    refetch,
  };
};

export default useDockerUpdates;
