import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import type { Host } from '../../types/host';
import { useErrorHandler } from './useErrorHandler';

interface UseHostResult {
  host: Host | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHost(hostId?: string): UseHostResult {
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();

  const fetchHost = useCallback(async () => {
    if (!hostId) {
      setHost(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Host>(`/api/hosts/${hostId}`);
      setHost(response.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch host');
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [hostId, handleError]);

  useEffect(() => {
    void fetchHost();
  }, [fetchHost]);

  return {
    host,
    loading,
    error,
    refetch: fetchHost,
  };
}

