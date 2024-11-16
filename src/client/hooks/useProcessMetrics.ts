import { useState, useEffect } from 'react';
import type { ProcessInfo } from '../../types/metrics';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';

interface UseProcessMetricsOptions {
  hostId: string;
  interval?: number;
}

interface UseProcessMetricsResult {
  processes: ProcessInfo[];
  loading: boolean;
  error: string | null;
}

export function useProcessMetrics({ hostId, interval = 5000 }: UseProcessMetricsOptions): UseProcessMetricsResult {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchProcesses = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/hosts/${hostId}/processes`);
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch processes');
        }
        setProcesses(data.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch processes';
        logger.error('Error fetching processes:', { error: errorMessage, hostId });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const handleProcessUpdate = (data: { hostId: string; process: ProcessInfo }) => {
      if (data.hostId !== hostId) return;

      setProcesses(prev => {
        const index = prev.findIndex(p => p.pid === data.process.pid);
        if (index === -1) {
          return [...prev, data.process];
        }
        const newProcesses = [...prev];
        newProcesses[index] = data.process;
        return newProcesses;
      });
    };

    const handleProcessRemove = (data: { hostId: string; pid: number }) => {
      if (data.hostId !== hostId) return;

      setProcesses(prev => prev.filter(p => p.pid !== data.pid));
    };

    if (socket) {
      // Subscribe to process updates
      socket.emit('process:monitor', { hostId });

      // Listen for process updates and removals
      socket.on('process:update', handleProcessUpdate);
      socket.on('process:remove', handleProcessRemove);

      // Initial fetch
      void fetchProcesses();

      // Set up polling interval
      if (interval > 0) {
        timeoutId = setInterval(fetchProcesses, interval);
      }

      return () => {
        socket.off('process:update', handleProcessUpdate);
        socket.off('process:remove', handleProcessRemove);
        socket.emit('process:unmonitor', { hostId });
        if (timeoutId) {
          clearInterval(timeoutId);
        }
      };
    }
  }, [socket, hostId, interval]);

  return {
    processes,
    loading,
    error,
  };
}
