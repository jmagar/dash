import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { DockerStats } from '@/types/docker';
import { logger } from '../utils/frontendLogger';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMonitoring = useCallback(() => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    socket.emit('docker:subscribe', { hostId });
  }, [hostId, enabled]);

  const stopMonitoring = useCallback(() => {
    socket.emit('docker:unsubscribe', { hostId });
  }, [hostId]);

  useEffect(() => {
    startMonitoring();

    const handleStats = (...args: unknown[]) => {
      const [data] = args;
      const statsData = data as { hostId: string; stats: DockerStats };
      if (statsData.hostId === hostId) {
        setStats(statsData.stats);
        setLoading(false);
      }
    };

    const handleError = (...args: unknown[]) => {
      const [data] = args;
      const errorData = data as { hostId: string; error: string };
      if (errorData.hostId === hostId) {
        setError(errorData.error);
        setLoading(false);
        logger.error('Docker stats error:', { error: errorData.error });
      }
    };

    socket.on('docker:stats', handleStats);
    socket.on('docker:error', handleError);

    return () => {
      stopMonitoring();
      socket.off('docker:stats', handleStats);
      socket.off('docker:error', handleError);
    };
  }, [hostId, startMonitoring, stopMonitoring]);

  return {
    stats,
    loading,
    error,
    refresh: startMonitoring,
  };
}
