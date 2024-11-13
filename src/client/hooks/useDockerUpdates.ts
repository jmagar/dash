import { useEffect, useState, useCallback } from 'react';

import type { Container } from '../../types';
import { listContainers } from '../api';
import { logger } from '../utils/frontendLogger';

export interface UseDockerUpdatesOptions {
  interval?: number;
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export function useDockerUpdates(options: UseDockerUpdatesOptions = {}): {
  containers: Container[];
  loading: boolean;
  error: string | null;
} {
  const {
    interval = 5000,
    enabled = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchContainers = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      logger.info('Fetching container list');

      const result = await listContainers();
      if (result.success) {
        const prevCount = containers.length;
        setContainers(result.data || []);
        logger.info('Containers updated', {
          count: result.data?.length || 0,
          changed: prevCount !== (result.data?.length || 0),
        });
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(result.error || 'Failed to fetch containers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      logger.error('Error fetching containers:', {
        error: errorMessage,
        retryCount,
        maxRetries,
      });

      if (retryCount < maxRetries) {
        logger.info('Retrying container fetch', {
          attempt: retryCount + 1,
          maxRetries,
        });
        setRetryCount(prev => prev + 1);
        setTimeout(() => void fetchContainers(), retryDelay);
      } else {
        setError(`Failed to fetch containers after ${maxRetries} attempts: ${errorMessage}`);
        setRetryCount(0); // Reset for next interval
      }
    } finally {
      setLoading(false);
    }
  }, [containers.length, maxRetries, retryCount, retryDelay]);

  useEffect(() => {
    if (!enabled) {
      logger.info('Docker updates disabled');
      return;
    }

    logger.info('Starting Docker container updates', {
      interval,
      maxRetries,
      retryDelay,
    });

    void fetchContainers();
    const timer = setInterval(() => void fetchContainers(), interval);

    return () => {
      logger.info('Cleaning up Docker container updates');
      clearInterval(timer);
    };
  }, [enabled, fetchContainers, interval, maxRetries, retryDelay]);

  return { containers, loading, error };
}
