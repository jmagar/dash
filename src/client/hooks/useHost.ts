import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { Host } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

interface UseHostOptions {
  hostId?: string;
  autoConnect?: boolean;
}

interface UseHostResult {
  host: Host | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  selectedHost: Host | null;
  selectHost: (host: Host | null) => void;
}

export function useHost({ hostId, autoConnect = true }: UseHostOptions): UseHostResult {
  const [host, setHost] = useState<Host | null>(null);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchHost = useCallback(async () => {
    if (!hostId) {
      setHost(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/hosts/${hostId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setHost(data.data);
        if (!selectedHost) {
          setSelectedHost(data.data);
        }
      } else {
        setError(data.error || 'Failed to fetch host');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch host';
      logger.error('Failed to fetch host:', { error: errorMsg, hostId });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [hostId, selectedHost]);

  const connect = useCallback(async () => {
    if (!host) {
      throw new Error('No host selected');
    }

    try {
      setLoading(true);
      setError(null);
      await new Promise<void>((resolve, reject) => {
        if (!socket) {
          reject(new Error('Socket not connected'));
          return;
        }

        socket.emit('host:connect', { hostId: host.id }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to host';
      logger.error('Failed to connect to host:', { error: errorMsg, hostId: host.id });
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [socket, host]);

  const disconnect = useCallback(async () => {
    if (!host) {
      throw new Error('No host selected');
    }

    try {
      setLoading(true);
      setError(null);
      await new Promise<void>((resolve, reject) => {
        if (!socket) {
          reject(new Error('Socket not connected'));
          return;
        }

        socket.emit('host:disconnect', { hostId: host.id }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to disconnect from host';
      logger.error('Failed to disconnect from host:', { error: errorMsg, hostId: host.id });
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [socket, host]);

  const refresh = useCallback(async () => {
    await fetchHost();
  }, [fetchHost]);

  const selectHost = useCallback((newHost: Host | null) => {
    setSelectedHost(newHost);
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('host:updated', (updatedHost: Host) => {
        if (updatedHost.id === hostId) {
          setHost(updatedHost);
          if (selectedHost?.id === updatedHost.id) {
            setSelectedHost(updatedHost);
          }
        }
      });

      return () => {
        socket.off('host:updated');
      };
    }
  }, [socket, hostId, selectedHost]);

  useEffect(() => {
    void fetchHost();
  }, [fetchHost]);

  useEffect(() => {
    if (autoConnect && host && host.agentStatus === 'offline') {
      void connect();
    }
  }, [autoConnect, host, connect]);

  return {
    host,
    loading,
    error,
    connect,
    disconnect,
    refresh,
    selectedHost,
    selectHost,
  };
}
