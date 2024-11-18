import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { logger } from '../utils/frontendLogger';
import type { ProcessInfo } from '../../types/process';

interface UseProcessMetricsResult {
  processes: ProcessInfo[];
  loading: boolean;
  error: string | null;
  killProcess: (pid: number, signal?: string) => Promise<void>;
}

export function useProcessMetrics(hostId: string): UseProcessMetricsResult {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    socket.emit('process:monitor', { hostId });

    socket.on('process:list', (...args: unknown[]) => {
      const [data] = args;
      const processData = data as { hostId: string; processes: ProcessInfo[] };
      if (processData.hostId === hostId) {
        setProcesses(processData.processes);
        setLoading(false);
      }
    });

    socket.on('process:update', (...args: unknown[]) => {
      const [data] = args;
      const processData = data as { hostId: string; process: ProcessInfo };
      if (processData.hostId === hostId) {
        setProcesses(prev => {
          const index = prev.findIndex(p => p.pid === processData.process.pid);
          if (index === -1) {
            return [...prev, processData.process];
          }
          const newProcesses = [...prev];
          newProcesses[index] = processData.process;
          return newProcesses;
        });
      }
    });

    socket.on('process:error', (...args: unknown[]) => {
      const [data] = args;
      const errorData = data as { hostId: string; error: string };
      if (errorData.hostId === hostId) {
        setError(errorData.error);
        setLoading(false);
      }
    });

    return () => {
      socket.emit('process:unmonitor', { hostId });
      socket.off('process:list');
      socket.off('process:update');
      socket.off('process:error');
    };
  }, [socket, hostId]);

  const killProcess = useCallback(async (pid: number, signal?: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      socket.emit('process:kill', { hostId, pid, signal });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to kill process';
      logger.error('Failed to kill process:', {
        error: errorMsg,
        pid,
        signal,
      });
      throw new Error(errorMsg);
    }
  }, [socket, hostId]);

  return { processes, loading, error, killProcess };
}
