import { useEffect, useState, useCallback } from 'react';

import { Container, Stack } from '../../types';
import { getContainers, getStacks } from '../api';
import logger from '../utils/frontendLogger';

export interface UseDockerUpdatesOptions {
  enabled?: boolean;
  type: 'containers' | 'stacks';
  interval?: number;
}

interface UseDockerUpdatesResult {
  data: Container[] | Stack[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDockerUpdates({
  enabled = true,
  type,
  interval = 5000,
}: UseDockerUpdatesOptions): UseDockerUpdatesResult {
  const [data, setData] = useState<Container[] | Stack[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const result = await (type === 'containers' ? getContainers() : getStacks());
      if (!result.success) {
        throw new Error(result.error || `Failed to fetch ${type}`);
      }
      setData(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to fetch ${type}`;
      logger.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void fetchData();

    const timer = setInterval(() => {
      void fetchData();
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, interval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
