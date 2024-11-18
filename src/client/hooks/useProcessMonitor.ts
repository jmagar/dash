import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { ProcessInfo } from '@/types/process';
import { logger } from '../utils/frontendLogger';

interface UseProcessMonitorOptions {
  hostId: string;
  enabled?: boolean;
}

interface UseProcessMonitorResult {
  processes: ProcessInfo[];
  selectedPid: number | null;
  loading: boolean;
  error: string | null;
  setSelectedPid: (pid: number | null) => void;
  killProcess: (pid: number, signal?: string) => void;
  refresh: () => void;
}

export function useProcessMonitor(options: UseProcessMonitorOptions | string): UseProcessMonitorResult {
  const hostId = typeof options === 'string' ? options : options.hostId;
  const enabled = typeof options === 'string' ? true : options.enabled ?? true;

  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessList = useCallback((data: { hostId: string; processes: ProcessInfo[] }) => {
    if (data.hostId === hostId) {
      setProcesses(data.processes);
    }
  }, [hostId]);

  const handleProcessStart = useCallback((data: { hostId: string; process: ProcessInfo }) => {
    if (data.hostId === hostId) {
      setProcesses(prev => [...prev, data.process]);
    }
  }, [hostId]);

  const handleProcessEnd = useCallback((data: { hostId: string; process: ProcessInfo }) => {
    if (data.hostId === hostId) {
      setProcesses(prev => prev.filter(p => p.pid !== data.process.pid));
    }
  }, [hostId]);

  const handleProcessChange = useCallback((data: { hostId: string; process: ProcessInfo; oldStatus: string }) => {
    if (data.hostId === hostId) {
      setProcesses(prev => prev.map(p => p.pid === data.process.pid ? data.process : p));
    }
  }, [hostId]);

  const startMonitoring = useCallback(() => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    socket.emit('process:monitor', { hostId });
  }, [hostId, enabled]);

  const stopMonitoring = useCallback(() => {
    socket.emit('process:unmonitor', { hostId });
  }, [hostId]);

  const killProcess = useCallback((pid: number, signal?: string) => {
    socket.emit('process:kill', { hostId, pid, signal });
  }, [hostId]);

  useEffect(() => {
    startMonitoring();

    socket.on('process:list', (...args: unknown[]) => {
      const [data] = args;
      const processData = data as { hostId: string; processes: ProcessInfo[] };
      if (processData.hostId === hostId) {
        setProcesses(processData.processes);
      }
    });

    socket.on('process:started', (...args: unknown[]) => {
      const [data] = args;
      const processData = data as { hostId: string; process: ProcessInfo };
      handleProcessStart(processData);
    });

    socket.on('process:ended', (...args: unknown[]) => {
      const [data] = args;
      const processData = data as { hostId: string; process: ProcessInfo };
      handleProcessEnd(processData);
    });

    socket.on('process:changed', (...args: unknown[]) => {
      const [data] = args;
      const processData = data as { hostId: string; process: ProcessInfo; oldStatus: string };
      handleProcessChange(processData);
    });

    socket.on('process:error', (...args: unknown[]) => {
      const [data] = args;
      const errorData = data as { hostId: string; error: string };
      if (errorData.hostId === hostId) {
        setError(errorData.error);
        logger.error('Process monitor error:', { error: errorData.error });
      }
    });

    return () => {
      stopMonitoring();
      socket.off('process:list');
      socket.off('process:started');
      socket.off('process:ended');
      socket.off('process:changed');
    };
  }, [hostId, startMonitoring, stopMonitoring, handleProcessStart, handleProcessEnd, handleProcessChange]);

  return {
    processes,
    selectedPid,
    loading,
    error,
    setSelectedPid,
    killProcess,
    refresh: startMonitoring,
  };
}
