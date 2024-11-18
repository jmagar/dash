import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { SystemMetrics } from '../../types/metrics';
import type { ProcessInfo } from '../../types/process';
import { logger } from '../utils/frontendLogger';

interface UseHostMetricsOptions {
  hostId: string;
  enabled?: boolean;
}

export function useHostMetrics(options: UseHostMetricsOptions | string) {
  const hostId = typeof options === 'string' ? options : options.hostId;
  const enabled = typeof options === 'string' ? true : options.enabled ?? true;

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMetricsUpdate = useCallback((...args: unknown[]) => {
    const data = args[0] as { hostId: string; metrics: SystemMetrics };
    if (data.hostId === hostId) {
      setMetrics(data.metrics);
    }
  }, [hostId]);

  const handleProcessUpdate = useCallback((...args: unknown[]) => {
    const data = args[0] as { hostId: string; processes: ProcessInfo[] };
    if (data.hostId === hostId) {
      setProcesses(data.processes);
    }
  }, [hostId]);

  const startMonitoring = useCallback(() => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    socket.emit('metrics:subscribe', { hostId });
    socket.emit('process:monitor', { hostId });
  }, [hostId, enabled]);

  const stopMonitoring = useCallback(() => {
    socket.emit('metrics:unsubscribe', { hostId });
    socket.emit('process:unmonitor', { hostId });
  }, [hostId]);

  useEffect(() => {
    startMonitoring();

    socket.on('metrics:update', handleMetricsUpdate);
    socket.on('process:metrics', handleProcessUpdate);
    socket.on('metrics:error', (...args: unknown[]) => {
      const data = args[0] as { hostId: string; error: string };
      if (data.hostId === hostId) {
        setError(data.error);
        logger.error('Host metrics error:', { error: data.error });
      }
    });

    return () => {
      stopMonitoring();
      socket.off('metrics:update', handleMetricsUpdate);
      socket.off('process:metrics', handleProcessUpdate);
    };
  }, [hostId, startMonitoring, stopMonitoring, handleMetricsUpdate, handleProcessUpdate]);

  return {
    metrics,
    processes,
    loading,
    error,
    refresh: startMonitoring,
  };
}
