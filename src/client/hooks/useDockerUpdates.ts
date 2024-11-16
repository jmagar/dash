import { useState, useEffect, useCallback } from 'react';
import type { Container } from '../../types/models-shared';
import { listContainers } from '../api/docker.client';
import { logger } from '../utils/frontendLogger';

export interface UseDockerUpdatesOptions {
  interval?: number;
  hostId: string;
}

export interface UseDockerUpdatesResult {
  containers: Container[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDockerUpdates({ interval = 5000, hostId }: UseDockerUpdatesOptions): UseDockerUpdatesResult {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContainers(hostId);
      setContainers(data);
    } catch (error) {
      logger.error('Failed to fetch containers:', {
        error: error instanceof Error ? error.message : String(error),
      });
      setError('Failed to fetch containers');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    void fetchContainers();

    if (interval > 0) {
      const timer = setInterval(() => {
        void fetchContainers();
      }, interval);

      return () => clearInterval(timer);
    }
  }, [fetchContainers, interval]);

  return {
    containers,
    loading,
    error,
    refresh: fetchContainers,
  };
}
