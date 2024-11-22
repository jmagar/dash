import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/frontendLogger';
import { useSocket } from './useSocket';
import type { TypedSocket } from './useSocket';
import type { SystemMetrics } from '../../types/metrics';
import type { ProcessInfo } from '../../types/process';

interface UseHostMetricsOptions {
  hostId: string;
  enabled?: boolean;
}

interface MetricsUpdateData {
  hostId: string;
  metrics: SystemMetrics;
}

interface ProcessMetricsData {
  hostId: string;
  processes: ProcessInfo[];
}

interface MetricsErrorData {
  hostId: string;
  error: string;
}

export function useHostMetrics(options: UseHostMetricsOptions | string): {
  metrics: SystemMetrics | null;
  processes: ProcessInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const hostId = typeof options === 'string' ? options : options.hostId;
  const enabled = typeof options === 'string' ? true : options.enabled ?? true;

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { socket, emit, on } = useSocket({
    hostId,
    autoReconnect: true,
  });

  const handleMetricsUpdate = useCallback((data: MetricsUpdateData) => {
    if (data.hostId === hostId) {
      setMetrics(data.metrics);
    }
  }, [hostId]);

  const handleProcessUpdate = useCallback((data: ProcessMetricsData) => {
    if (data.hostId === hostId) {
      setProcesses(data.processes);
    }
  }, [hostId]);

  const handleMetricsError = useCallback((data: MetricsErrorData) => {
    if (data.hostId === hostId) {
      setError(data.error);
      logger.error('Host metrics error:', { error: data.error });
    }
  }, [hostId]);

  const startMonitoring = useCallback(() => {
    if (!enabled || !socket) return;

    setLoading(true);
    setError(null);

    try {
      emit('metrics:subscribe', { hostId });
      emit('process:monitor', { hostId });
    } catch (error) {
      logger.error('Failed to start monitoring:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
      setError('Failed to start monitoring');
    }
  }, [socket, hostId, enabled, emit]);

  const stopMonitoring = useCallback(() => {
    if (!socket) return;

    try {
      emit('metrics:unsubscribe', { hostId });
      emit('process:unmonitor', { hostId });
    } catch (error) {
      logger.error('Failed to stop monitoring:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
    }
  }, [socket, hostId, emit]);

  useEffect(() => {
    if (!socket) return;

    try {
      startMonitoring();

      const unsubMetrics = on('metrics:update', handleMetricsUpdate);
      const unsubProcess = on('process:metrics', handleProcessUpdate);
      const unsubError = on('metrics:error', handleMetricsError);

      return () => {
        stopMonitoring();
        unsubMetrics();
        unsubProcess();
        unsubError();
      };
    } catch (error) {
      logger.error('Error in metrics monitoring effect:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
      setError('Failed to setup metrics monitoring');
    }
  }, [
    socket,
    hostId,
    startMonitoring,
    stopMonitoring,
    handleMetricsUpdate,
    handleProcessUpdate,
    handleMetricsError,
    on
  ]);

  return {
    metrics,
    processes,
    loading,
    error,
    refresh: startMonitoring,
  };
}
