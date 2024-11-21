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

  const socket: TypedSocket | null = useSocket();

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
      socket.emit('metrics:subscribe', { hostId });
      socket.emit('process:monitor', { hostId });
    } catch (error) {
      logger.error('Failed to start monitoring:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
      setError('Failed to start monitoring');
    }
  }, [socket, hostId, enabled]);

  const stopMonitoring = useCallback(() => {
    if (!socket) return;

    try {
      socket.emit('metrics:unsubscribe', { hostId });
      socket.emit('process:unmonitor', { hostId });
    } catch (error) {
      logger.error('Failed to stop monitoring:', {
        error: error instanceof Error ? error.message : String(error),
        hostId
      });
    }
  }, [socket, hostId]);

  useEffect(() => {
    if (!socket) return;

    try {
      startMonitoring();

      socket.on('metrics:update', handleMetricsUpdate);
      socket.on('process:metrics', handleProcessUpdate);
      socket.on('metrics:error', handleMetricsError);

      return () => {
        stopMonitoring();
        socket.off('metrics:update', handleMetricsUpdate);
        socket.off('process:metrics', handleProcessUpdate);
        socket.off('metrics:error', handleMetricsError);
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
    handleMetricsError
  ]);

  return {
    metrics,
    processes,
    loading,
    error,
    refresh: startMonitoring,
  };
}
