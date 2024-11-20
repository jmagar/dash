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
    if (!socket) return;

    const handleProcessList = (...args: unknown[]) => {
      const [data] = args as [ProcessListData];
      if (data.hostId === hostId) {
        setProcesses(data.processes);
        setLoading(false);
      }
    };

    const handleProcessUpdate = (...args: unknown[]) => {
      const [data] = args as [ProcessUpdateData];
      if (data.hostId === hostId) {
        setProcesses((prevProcesses) =>
          prevProcesses.map((p) => (p.pid === data.process.pid ? data.process : p))
        );
      }
    };

    const handleProcessError = (...args: unknown[]) => {
      const [data] = args as [ProcessErrorData];
      if (data.hostId === hostId) {
        setError(data.error);
        setLoading(false);
      }
    };

    socket.on('process:list', handleProcessList);
    socket.on('process:update', handleProcessUpdate);
    socket.on('process:error', handleProcessError);

    // Request initial process list
    socket.emit('process:monitor', { hostId });

    return () => {
      socket.off('process:list', handleProcessList);
      socket.off('process:update', handleProcessUpdate);
      socket.off('process:error', handleProcessError);
      socket.emit('process:unmonitor', { hostId });
    };
  }, [socket, hostId]);

  const killProcess = useCallback(
    async (pid: number, signal?: string) => {
      if (!socket) {
        throw new Error('Socket not connected');
      }

      return new Promise<void>((resolve, reject) => {
        const handleKillSuccess = (...args: unknown[]) => {
          resolve();
          socket.off('process:kill:success', handleKillSuccess);
          socket.off('process:kill:error', handleKillError);
        };

        const handleKillError = (...args: unknown[]) => {
          const [error] = args as [string];
          reject(new Error(error));
          socket.off('process:kill:success', handleKillSuccess);
          socket.off('process:kill:error', handleKillError);
        };

        socket.on('process:kill:success', handleKillSuccess);
        socket.on('process:kill:error', handleKillError);

        socket.emit('process:kill', { hostId, pid, signal });
      });
    },
    [socket, hostId]
  );

  return { processes, loading, error, killProcess };
}
