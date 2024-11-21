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

    socket.emit('metrics:subscribe', { hostId });
    socket.emit('process:monitor', { hostId });
  }, [socket, hostId, enabled]);

  const stopMonitoring = useCallback(() => {
    if (!socket) return;

    socket.emit('metrics:unsubscribe', { hostId });
    socket.emit('process:unmonitor', { hostId });
  }, [socket, hostId]);

  useEffect(() => {
    if (!socket) return;

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
