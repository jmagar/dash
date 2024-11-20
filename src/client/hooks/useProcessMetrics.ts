import { useState, useEffect, useCallback } from 'react';

import { logger } from '../utils/frontendLogger';

import { useSocket } from './useSocket';

import type { ProcessInfo } from '../../types/process';

interface UseProcessMetricsResult {
  processes: ProcessInfo[];
  loading: boolean;
  error: string | null;
  killProcess: (pid: number, signal?: string) => Promise<void>;
}

interface ProcessListData {
  hostId: string;
  processes: ProcessInfo[];
}

interface ProcessUpdateData {
  hostId: string;
  process: ProcessInfo;
}

interface ProcessErrorData {
  hostId: string;
  error: string;
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

    const handleProcessList = (data: ProcessListData) => {
      if (data.hostId === hostId) {
        setProcesses(data.processes);
        setLoading(false);
      }
    };

    const handleProcessUpdate = (data: ProcessUpdateData) => {
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
    };

    const handleProcessError = (data: ProcessErrorData) => {
      if (data.hostId === hostId) {
        setError(data.error);
        setLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    socket.emit('process:monitor', { hostId });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    socket.on('process:list', handleProcessList);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    socket.on('process:update', handleProcessUpdate);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    socket.on('process:error', handleProcessError);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      socket.emit('process:unmonitor', { hostId });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      socket.off('process:list', handleProcessList);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      socket.off('process:update', handleProcessUpdate);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      socket.off('process:error', handleProcessError);
    };
  }, [socket, hostId]);

  const killProcess = useCallback(async (pid: number, signal?: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Kill process timeout'));
        }, 5000);

        const handleSuccess = () => {
          clearTimeout(timeout);
          resolve();
        };

        const handleError = (error: string) => {
          clearTimeout(timeout);
          reject(new Error(error));
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        socket.emit('process:kill', { hostId, pid, signal });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        socket.once('process:kill:success', handleSuccess);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        socket.once('process:kill:error', handleError);

        // Clean up event listeners if promise resolves/rejects
        Promise.race([
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
          new Promise<void>((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            socket.once('process:kill:success', () => resolve());
          })
        ]).finally(() => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          socket.off('process:kill:success', handleSuccess);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          socket.off('process:kill:error', handleError);
        });
      });
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
