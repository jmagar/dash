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

    socket.on('process:list', (data: { hostId: string; processes: ProcessInfo[] }) => {
      if (data.hostId === hostId) {
        setProcesses(data.processes);
        setLoading(false);
      }
    });

    socket.on('process:update', (data: { hostId: string; process: ProcessInfo }) => {
      if (data.hostId === hostId) {
        setProcesses(prev => {
          const index = prev.findIndex(p => p.pid === data.process.pid);
          if (index === -1) {
            return [...prev, data.process];
          }
          const newProcesses = [...prev];
          newProcesses[index] = data.process;
          return newProcesses;
        });
      }
    });

    socket.on('process:error', (data: { hostId: string; error: string }) => {
      if (data.hostId === hostId) {
        setError(data.error);
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
