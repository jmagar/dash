import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
import type { DockerStats, AgentCommand } from '../../types/socket.io';

interface UseDockerStatsOptions {
  hostId: string;
  interval?: number;
}

interface UseDockerStatsResult {
  stats: DockerStats | null;
  error: Error | null;
  refresh: () => void;
}

export function useDockerStats({ hostId, interval = 5000 }: UseDockerStatsOptions): UseDockerStatsResult {
  const socket = useSocket();
  const [stats, setStats] = useState<DockerStats | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(() => {
    if (!socket) {
      setError(new Error('Socket not connected'));
      return;
    }

    try {
      socket.emit('command:execute', {
        hostId,
        command: {
          command: 'docker stats',
          args: ['--no-stream', '--format', 'json']
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch Docker stats');
      setError(error);
      logger.error('Failed to fetch Docker stats:', {
        hostId,
        error: error.message
      });
    }
  }, [socket, hostId]);

  useEffect(() => {
    if (!socket) return;

    // Subscribe to Docker events
    socket.emit('docker:subscribe', { hostId });

    // Handle Docker stats updates
    const handleStats = (data: { hostId: string; stats: DockerStats }) => {
      if (data.hostId === hostId) {
        setStats(data.stats);
        setError(null);
      }
    };

    // Handle Docker errors
    const handleError = (data: { hostId: string; error: string }) => {
      if (data.hostId === hostId) {
        setError(new Error(data.error));
      }
    };

    socket.on('docker:stats', handleStats);
    socket.on('docker:error', handleError);

    // Initial fetch
    refresh();

    // Set up interval for refreshing stats
    const intervalId = setInterval(refresh, interval);

    return () => {
      socket.off('docker:stats', handleStats);
      socket.off('docker:error', handleError);
      socket.emit('docker:unsubscribe', { hostId });
      clearInterval(intervalId);
    };
  }, [socket, hostId, interval, refresh]);

  return {
    stats,
    error,
    refresh
  };
}
