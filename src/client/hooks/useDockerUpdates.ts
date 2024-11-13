import { useEffect, useState } from 'react';

import type { Container } from '../../types';
import { listContainers } from '../api';
import { logger } from '../utils/frontendLogger';

export interface UseDockerUpdatesOptions {
  interval?: number;
  enabled?: boolean;
}

export function useDockerUpdates(options: UseDockerUpdatesOptions = {}): {
  containers: Container[];
  loading: boolean;
  error: string | null;
} {
  const { interval = 5000, enabled = true } = options;
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchContainers = async (): Promise<void> => {
      try {
        setError(null);
        const result = await listContainers();
        if (result.success) {
          setContainers(result.data || []);
        } else {
          setError(result.error || 'Failed to fetch containers');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        logger.error('Error fetching containers:', { error: errorMessage });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchContainers();
    const timer = setInterval(() => void fetchContainers(), interval);

    return () => {
      clearInterval(timer);
    };
  }, [interval, enabled]);

  return { containers, loading, error };
}
