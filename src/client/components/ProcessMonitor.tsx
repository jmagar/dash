import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { ProcessInfo } from '@/types/process';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface ProcessMonitorProps {
  hostId: string;
}

interface ProcessListData {
  hostId: string;
  processes: ProcessInfo[];
}

interface ProcessErrorData {
  hostId: string;
  error: string;
}

export function ProcessMonitor({ hostId }: ProcessMonitorProps) {
  const socket = useSocket();
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('process:monitor', { hostId });

    const handleProcessList = (...args: unknown[]) => {
      const [data] = args as [{ hostId: string; processes: ProcessInfo[] }];
      if (data.hostId === hostId) {
        setProcesses(data.processes);
      }
    };

    const handleProcessError = (...args: unknown[]) => {
      const [data] = args as [{ hostId: string; error: string }];
      if (data.hostId === hostId) {
        setError(data.error);
        LoggingManager.getInstance().();
      }
    };

    socket.on('process:list', handleProcessList);
    socket.on('process:error', handleProcessError);

    return () => {
      socket.emit('process:unmonitor', { hostId });
      socket.off('process:list', handleProcessList);
      socket.off('process:error', handleProcessError);
    };
  }, [socket, hostId]);

  const handleKillProcess = async (pid: number) => {
    if (!socket) return;

    try {
      socket.emit('process:kill', { hostId, pid });
    } catch (error) {
      logger.error('Failed to kill process:', {
        error: error instanceof Error ? error.message : String(error),
        pid,
      });
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <table>
        <thead>
          <tr>
            <th>PID</th>
            <th>Name</th>
            <th>CPU %</th>
            <th>Memory %</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {processes.map((process) => (
            <tr key={process.pid}>
              <td>{process.pid}</td>
              <td>{process.name}</td>
              <td>{process.cpuUsage.toFixed(1)}%</td>
              <td>{process.memoryUsage.toFixed(1)}%</td>
              <td>{process.status}</td>
              <td>
                <button onClick={() => handleKillProcess(process.pid)}>Kill</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

