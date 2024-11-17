import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { ProcessInfo } from '../../types/metrics';
import { logger } from '../utils/frontendLogger';

interface ProcessMonitorProps {
  hostId: string;
}

export function ProcessMonitor({ hostId }: ProcessMonitorProps) {
  const socket = useSocket();
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('process:monitor', { hostId });

    socket.on('process:list', (data) => {
      if (data.hostId === hostId) {
        setProcesses(data.processes);
      }
    });

    socket.on('process:error', (data) => {
      if (data.hostId === hostId) {
        setError(data.error);
        logger.error('Process monitor error:', { error: data.error });
      }
    });

    return () => {
      socket.emit('process:unmonitor', { hostId });
      socket.off('process:list');
      socket.off('process:error');
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
