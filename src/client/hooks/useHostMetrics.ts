import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { SystemMetrics, ProcessMetrics } from '../../types/metrics';
import { logger } from '../utils/frontendLogger';

interface UseHostMetricsOptions {
  hostId?: string;
  interval?: number;
  enabled?: boolean;
}

interface UseHostMetricsResult {
  metrics: SystemMetrics | null;
  processMetrics: ProcessMetrics[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHostMetrics({
  hostId,
  interval = 5000,
  enabled = true,
}: UseHostMetricsOptions): UseHostMetricsResult {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processMetrics, setProcessMetrics] = useState<ProcessMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  const fetchMetrics = useCallback(async () => {
    if (!hostId) {
      setMetrics(null);
      setProcessMetrics([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [metricsResponse, processResponse] = await Promise.all([
        fetch(`/api/hosts/${hostId}/metrics`),
        fetch(`/api/hosts/${hostId}/processes`),
      ]);

      const [metricsData, processData] = await Promise.all([
        metricsResponse.json(),
        processResponse.json(),
      ]);

      if (!metricsData.success) {
        throw new Error(metricsData.error || 'Failed to fetch system metrics');
      }

      if (!processData.success) {
        throw new Error(processData.error || 'Failed to fetch process metrics');
      }

      setMetrics(metricsData.data);
      setProcessMetrics(processData.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch metrics';
      logger.error('Error fetching metrics:', { error: errorMsg, hostId });
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    if (!socket || !enabled || !hostId) return;

    // Subscribe to metrics updates
    socket.emit('metrics:subscribe', { hostId });

    // Handle metrics updates
    const handleMetricsUpdate = (data: { hostId: string; metrics: SystemMetrics }) => {
      if (data.hostId === hostId) {
        setMetrics(data.metrics);
        setError(null);
      }
    };

    // Handle process metrics updates
    const handleProcessUpdate = (data: { hostId: string; metrics: ProcessMetrics[] }) => {
      if (data.hostId === hostId) {
        setProcessMetrics(data.metrics);
        setError(null);
      }
    };

    socket.on('metrics:update', handleMetricsUpdate);
    socket.on('process:metrics', handleProcessUpdate);

    // Initial fetch
    void fetchMetrics();

    // Set up polling interval
    let timeoutId: NodeJS.Timeout;
    if (interval > 0) {
      timeoutId = setInterval(fetchMetrics, interval);
    }

    return () => {
      socket.off('metrics:update', handleMetricsUpdate);
      socket.off('process:metrics', handleProcessUpdate);
      socket.emit('metrics:unsubscribe', { hostId });
      if (timeoutId) {
        clearInterval(timeoutId);
      }
    };
  }, [socket, hostId, interval, enabled, fetchMetrics]);

  return {
    metrics,
    processMetrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}
