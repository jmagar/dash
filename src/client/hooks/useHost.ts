import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { Host } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

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
  const { socket, emit, on } = useSocket({
    hostId: hostId || '',
    autoReconnect: true,
  });

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
      const data: { success: boolean; data?: Host; error?: string } = await response.json();

      if (data.success && data.data) {
        setHost(data.data);
        if (!selectedHost) {
          setSelectedHost(data.data);
        }
      } else {
        setHost(null);
        setError(data.error || 'Failed to fetch host');
      }
    } catch (err) {
      setHost(null);
      setError('Failed to fetch host information');
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

        emit('host:connect', { hostId: host.id }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to host';
      loggerLoggingManager.getInstance().();
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [socket, host, emit]);

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

        emit('host:disconnect', { hostId: host.id }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to disconnect from host';
      loggerLoggingManager.getInstance().();
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [socket, host, emit]);

  const refresh = useCallback(async () => {
    await fetchHost();
  }, [fetchHost]);

  const selectHost = useCallback((newHost: Host | null) => {
    setSelectedHost(newHost);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleHostUpdate = (data: { hostId: string; host: Host }) => {
        const updatedHost = data.host;
        if (updatedHost.id === hostId) {
          setHost(updatedHost);
          if (selectedHost?.id === updatedHost.id) {
            setSelectedHost(updatedHost);
          }
        }
      };

      const unsubHostUpdate = on('host:updated', handleHostUpdate);

      return () => {
        unsubHostUpdate();
      };
    }
  }, [socket, hostId, selectedHost, on]);

  useEffect(() => {
    if (autoConnect && host && socket) {
      connect().catch((error) => {
        loggerLoggingManager.getInstance().();
      });
    }
  }, [autoConnect, host, socket, connect]);

  useEffect(() => {
    fetchHost();
  }, [fetchHost]);

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

