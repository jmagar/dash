import React, { useState, useMemo } from 'react';
import { useProcessMonitor } from '../hooks/useProcessMonitor';
import type { ProcessInfo } from '../../server/services/process.service';

interface ProcessMonitorProps {
  hostId: string;
  onError?: (error: string) => void;
}

export function ProcessMonitor({ hostId, onError }: ProcessMonitorProps) {
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [sortField, setSortField] = useState<keyof ProcessInfo>('cpu');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');

  const {
    processes,
    isMonitoring,
    error,
    startMonitoring,
    stopMonitoring,
    killProcess,
  } = useProcessMonitor({
    hostId,
    onError,
    onProcessStart: (process) => {
      console.log('Process started:', process);
    },
    onProcessEnd: (process) => {
      console.log('Process ended:', process);
      if (selectedPid === process.pid) {
        setSelectedPid(null);
      }
    },
    onProcessChange: (process, oldStatus) => {
      console.log('Process changed:', process, 'Old status:', oldStatus);
    },
  });

  // Sort and filter processes
  const filteredProcesses = useMemo(() => {
    let result = [...processes];

    // Apply filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(lowerFilter) ||
        p.command.toLowerCase().includes(lowerFilter) ||
        p.user.toLowerCase().includes(lowerFilter) ||
        p.pid.toString().includes(lowerFilter)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return result;
  }, [processes, sortField, sortDirection, filter]);

  const handleSort = (field: keyof ProcessInfo) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleKillProcess = (pid: number) => {
    if (window.confirm('Are you sure you want to kill this process?')) {
      killProcess(pid);
    }
  };

  const handleForceKill = (pid: number) => {
    if (window.confirm('Are you sure you want to force kill this process?')) {
      killProcess(pid, 'SIGKILL');
    }
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Process Monitor</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Filter processes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isMonitoring ? (
            <button
              onClick={stopMonitoring}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Stop Monitoring
            </button>
          ) : (
            <button
              onClick={startMonitoring}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Start Monitoring
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: 'pid', label: 'PID' },
                { key: 'name', label: 'Name' },
                { key: 'user', label: 'User' },
                { key: 'cpu', label: 'CPU %' },
                { key: 'memory', label: 'Memory %' },
                { key: 'status', label: 'Status' },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof ProcessInfo)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-1">
                    <span>{label}</span>
                    {sortField === key && (
                      <span className="text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProcesses.map((process) => (
              <tr
                key={process.pid}
                onClick={() => setSelectedPid(process.pid)}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedPid === process.pid ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{process.pid}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{process.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{process.user}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{process.cpu.toFixed(1)}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{process.memory.toFixed(1)}%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${process.status === 'running' ? 'bg-green-100 text-green-800' :
                      process.status === 'stopped' ? 'bg-yellow-100 text-yellow-800' :
                      process.status === 'zombie' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'}`}>
                    {process.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleKillProcess(process.pid);
                    }}
                    className="text-red-600 hover:text-red-900 mr-2"
                  >
                    Kill
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleForceKill(process.pid);
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Force Kill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPid && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="text-lg font-semibold mb-2">Process Details</h3>
          <pre className="whitespace-pre-wrap overflow-auto max-h-96">
            {JSON.stringify(
              processes.find((p) => p.pid === selectedPid),
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
