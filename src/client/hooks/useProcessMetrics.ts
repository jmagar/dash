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
  const { socket, emit, on } = useSocket({
    hostId,
    autoReconnect: true,
  });

  useEffect(() => {
    if (!socket) return;

    const handleProcessList = (data: ProcessListData) => {
      if (data.hostId === hostId) {
        setProcesses(data.processes);
        setLoading(false);
      }
    };

    const handleProcessUpdate = (data: ProcessUpdateData) => {
      if (data.hostId === hostId) {
        setProcesses((prevProcesses) =>
          prevProcesses.map((p) => (p.pid === data.process.pid ? data.process : p))
        );
      }
    };

    const handleProcessError = (data: ProcessErrorData) => {
      if (data.hostId === hostId) {
        setError(data.error);
        setLoading(false);
      }
    };

    const unsubProcessList = on('process:list', handleProcessList);
    const unsubProcessUpdate = on('process:update', handleProcessUpdate);
    const unsubProcessError = on('process:error', handleProcessError);

    // Request initial process list
    emit('process:monitor', { hostId });

    return () => {
      unsubProcessList();
      unsubProcessUpdate();
      unsubProcessError();
      emit('process:unmonitor', { hostId });
    };
  }, [socket, hostId, emit, on]);

  const killProcess = useCallback(
    async (pid: number, signal?: string) => {
      if (!socket) {
        throw new Error('Socket not connected');
      }

      return new Promise<void>((resolve, reject) => {
        const handleKillSuccess = () => {
          resolve();
          unsubKillSuccess();
          unsubKillError();
        };

        const handleKillError = (error: string) => {
          reject(new Error(error));
          unsubKillSuccess();
          unsubKillError();
        };

        const unsubKillSuccess = on('process:kill:success', handleKillSuccess);
        const unsubKillError = on('process:kill:error', handleKillError);

        emit('process:kill', { hostId, pid, signal });
      });
    },
    [socket, hostId, emit, on]
  );

  return { processes, loading, error, killProcess };
}
