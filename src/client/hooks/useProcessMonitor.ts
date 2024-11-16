import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { ProcessInfo } from '../../types/metrics';

interface UseProcessMonitorOptions {
  hostId: string;
  autoStart?: boolean;
  onProcessStart?: (process: ProcessInfo) => void;
  onProcessEnd?: (process: ProcessInfo) => void;
  onProcessChange?: (process: ProcessInfo, oldStatus: string) => void;
  onError?: (error: string) => void;
}

export function useProcessMonitor({
  hostId,
  autoStart = true,
  onProcessStart,
  onProcessEnd,
  onProcessChange,
  onError,
}: UseProcessMonitorOptions) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();

  // Update processes when receiving a new list
  const handleProcessList = useCallback((data: { hostId: string; processes: ProcessInfo[] }) => {
    if (data.hostId === hostId) {
      setProcesses(data.processes);
    }
  }, [hostId]);

  // Handle process start event
  const handleProcessStart = useCallback((data: { hostId: string; process: ProcessInfo }) => {
    if (data.hostId === hostId) {
      setProcesses(prev => [...prev, data.process]);
      onProcessStart?.(data.process);
    }
  }, [hostId, onProcessStart]);

  // Handle process end event
  const handleProcessEnd = useCallback((data: { hostId: string; process: ProcessInfo }) => {
    if (data.hostId === hostId) {
      setProcesses(prev => prev.filter(p => p.pid !== data.process.pid));
      onProcessEnd?.(data.process);
    }
  }, [hostId, onProcessEnd]);

  // Handle process change event
  const handleProcessChange = useCallback((data: { hostId: string; process: ProcessInfo; oldStatus: string }) => {
    if (data.hostId === hostId) {
      setProcesses(prev =>
        prev.map(p => (p.pid === data.process.pid ? data.process : p))
      );
      onProcessChange?.(data.process, data.oldStatus);
    }
  }, [hostId, onProcessChange]);

  // Handle error event
  const handleError = useCallback((data: { hostId: string; error: string }) => {
    if (data.hostId === hostId) {
      setError(data.error);
      onError?.(data.error);
    }
  }, [hostId, onError]);

  // Start monitoring processes
  const startMonitoring = useCallback(() => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      socket.emit('process:monitor', { hostId });
      setIsMonitoring(true);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start monitoring';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [socket, hostId, onError]);

  // Stop monitoring processes
  const stopMonitoring = useCallback(() => {
    if (!socket) return;

    try {
      socket.emit('process:unmonitor', { hostId });
      setIsMonitoring(false);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop monitoring';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [socket, hostId, onError]);

  // Kill a process
  const killProcess = useCallback((pid: number, signal?: string) => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      socket.emit('process:kill', { hostId, pid, signal });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to kill process';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [socket, hostId, onError]);

  useEffect(() => {
    if (!socket) return;

    socket.on('process:list', handleProcessList);
    socket.on('process:started', handleProcessStart);
    socket.on('process:ended', handleProcessEnd);
    socket.on('process:changed', handleProcessChange);
    socket.on('process:error', handleError);

    if (autoStart) {
      startMonitoring();
    }

    return () => {
      socket.off('process:list', handleProcessList);
      socket.off('process:started', handleProcessStart);
      socket.off('process:ended', handleProcessEnd);
      socket.off('process:changed', handleProcessChange);
      socket.off('process:error', handleError);
      stopMonitoring();
    };
  }, [
    socket,
    autoStart,
    startMonitoring,
    stopMonitoring,
    handleProcessList,
    handleProcessStart,
    handleProcessEnd,
    handleProcessChange,
    handleError,
  ]);

  return {
    processes,
    isMonitoring,
    error,
    startMonitoring,
    stopMonitoring,
    killProcess,
  };
}
