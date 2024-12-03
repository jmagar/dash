import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { DockerStats } from '@/types/docker';
import { logger } from '../utils/frontendLogger';
import { useQuery } from './useQuery';
import { LoggingManager } from '../../../../../../../../src/server/utils/logging/LoggingManager';

interface UseDockerStatsOptions {
  hostId: string;
  enabled?: boolean;
}

interface UseDockerStatsResult {
  stats: DockerStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDockerStats(options: UseDockerStatsOptions | string): UseDockerStatsResult {
  const hostId = typeof options === 'string' ? options : options.hostId;
  const enabled = typeof options === 'string' ? true : options.enabled ?? true;

  const [stats, setStats] = useState<DockerStats | null>(null);

  // Initial fetch and refresh functionality using useQuery
  const fetchStats = useCallback(async () => {
    return new Promise<DockerStats>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Docker stats request timed out'));
      }, 10000); // 10 second timeout

      socket.emit('docker:subscribe', { hostId });

      function handleInitialStats(...args: unknown[]) {
        const [data] = args;
        const statsData = data as { hostId: string; stats: DockerStats };
        if (statsData.hostId === hostId) {
          clearTimeout(timeout);
          socket.off('docker:stats', handleInitialStats);
          socket.off('docker:error', handleInitialError);
          resolve(statsData.stats);
        }
      }

      function handleInitialError(...args: unknown[]) {
        const [data] = args;
        const errorData = data as { hostId: string; error: string };
        if (errorData.hostId === hostId) {
          clearTimeout(timeout);
          socket.off('docker:stats', handleInitialStats);
          socket.off('docker:error', handleInitialError);
          reject(new Error(errorData.error));
        }
      }

      socket.on('docker:stats', handleInitialStats);
      socket.on('docker:error', handleInitialError);
    });
  }, [hostId]);

  const { isLoading, error, refetch } = useQuery(fetchStats, {
    enabled: enabled,
    onSuccess: (data) => setStats(data),
    onError: (err) => {
      loggerLoggingManager.getInstance().();
    }
  });

  // Real-time updates
  useEffect(() => {
    if (!enabled) return;

    function handleStats(...args: unknown[]) {
      const [data] = args;
      const statsData = data as { hostId: string; stats: DockerStats };
      if (statsData.hostId === hostId) {
        setStats(statsData.stats);
      }
    }

    function handleError(...args: unknown[]) {
      const [data] = args;
      const errorData = data as { hostId: string; error: string };
      if (errorData.hostId === hostId) {
        loggerLoggingManager.getInstance().();
      }
    }

    socket.on('docker:stats', handleStats);
    socket.on('docker:error', handleError);

    return () => {
      socket.emit('docker:unsubscribe', { hostId });
      socket.off('docker:stats', handleStats);
      socket.off('docker:error', handleError);
    };
  }, [hostId, enabled]);

  return {
    stats,
    loading: isLoading,
    error: error?.message || null,
    refresh: refetch,
  };
}

