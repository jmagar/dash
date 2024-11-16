import React, { useState } from 'react';
import type { ProcessLimits, ProcessLimitConfig } from '../../types/process-limits';

interface ProcessLimitsProps {
  config: ProcessLimitConfig;
  onConfigChange: (config: ProcessLimitConfig) => void;
  onApplyLimits: () => void;
}

export function ProcessLimits({ config, onConfigChange, onApplyLimits }: ProcessLimitsProps) {
  const [selectedProcess, setSelectedProcess] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  const handleGlobalLimitChange = (limits: ProcessLimits) => {
    onConfigChange({
      ...config,
      globalLimits: limits,
    });
  };

  const handleProcessLimitChange = (processName: string, limits: ProcessLimits) => {
    onConfigChange({
      ...config,
      processLimits: {
        ...config.processLimits,
        [processName]: limits,
      },
    });
  };

  const handleUserLimitChange = (username: string, limits: ProcessLimits) => {
    onConfigChange({
      ...config,
      userLimits: {
        ...config.userLimits,
        [username]: limits,
      },
    });
  };

  const renderLimitControls = (
    limits: ProcessLimits | undefined,
    onChange: (limits: ProcessLimits) => void
  ) => (
    <div className="space-y-4">
      {/* CPU Limits */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">CPU Limits</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="cpu-percentage" className="block text-sm font-medium text-gray-700">
              Percentage
            </label>
            <input
              id="cpu-percentage"
              type="number"
              min="0"
              max="100"
              value={limits?.cpu?.percentage ?? 0}
              onChange={(e) => onChange({
                ...limits,
                cpu: {
                  percentage: Number(e.target.value),
                  action: limits?.cpu?.action ?? 'notify',
                  duration: limits?.cpu?.duration,
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="cpu-action" className="block text-sm font-medium text-gray-700">
              Action
            </label>
            <select
              id="cpu-action"
              value={limits?.cpu?.action ?? 'notify'}
              onChange={(e) => onChange({
                ...limits,
                cpu: {
                  percentage: limits?.cpu?.percentage ?? 0,
                  action: e.target.value as 'notify' | 'kill' | 'renice',
                  duration: limits?.cpu?.duration,
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="notify">Notify</option>
              <option value="kill">Kill</option>
              <option value="renice">Renice</option>
            </select>
          </div>
          <div>
            <label htmlFor="cpu-duration" className="block text-sm font-medium text-gray-700">
              Duration (s)
            </label>
            <input
              id="cpu-duration"
              type="number"
              min="0"
              value={limits?.cpu?.duration ?? 0}
              onChange={(e) => onChange({
                ...limits,
                cpu: {
                  percentage: limits?.cpu?.percentage ?? 0,
                  action: limits?.cpu?.action ?? 'notify',
                  duration: Number(e.target.value),
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Memory Limits */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Memory Limits</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="memory-percentage" className="block text-sm font-medium text-gray-700">
              Percentage
            </label>
            <input
              id="memory-percentage"
              type="number"
              min="0"
              max="100"
              value={limits?.memory?.percentage ?? 0}
              onChange={(e) => onChange({
                ...limits,
                memory: {
                  percentage: Number(e.target.value),
                  action: limits?.memory?.action ?? 'notify',
                  duration: limits?.memory?.duration,
                  bytes: limits?.memory?.bytes,
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="memory-action" className="block text-sm font-medium text-gray-700">
              Action
            </label>
            <select
              id="memory-action"
              value={limits?.memory?.action ?? 'notify'}
              onChange={(e) => onChange({
                ...limits,
                memory: {
                  percentage: limits?.memory?.percentage ?? 0,
                  action: e.target.value as 'notify' | 'kill' | 'limit',
                  duration: limits?.memory?.duration,
                  bytes: limits?.memory?.bytes,
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="notify">Notify</option>
              <option value="kill">Kill</option>
              <option value="limit">Limit</option>
            </select>
          </div>
          <div>
            <label htmlFor="memory-duration" className="block text-sm font-medium text-gray-700">
              Duration (s)
            </label>
            <input
              id="memory-duration"
              type="number"
              min="0"
              value={limits?.memory?.duration ?? 0}
              onChange={(e) => onChange({
                ...limits,
                memory: {
                  percentage: limits?.memory?.percentage ?? 0,
                  action: limits?.memory?.action ?? 'notify',
                  duration: Number(e.target.value),
                  bytes: limits?.memory?.bytes,
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Child Process Limits */}
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Child Process Limits</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="children-count" className="block text-sm font-medium text-gray-700">
              Max Count
            </label>
            <input
              id="children-count"
              type="number"
              min="0"
              value={limits?.children?.count ?? 0}
              onChange={(e) => onChange({
                ...limits,
                children: {
                  count: Number(e.target.value),
                  action: limits?.children?.action ?? 'notify',
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="children-action" className="block text-sm font-medium text-gray-700">
              Action
            </label>
            <select
              id="children-action"
              value={limits?.children?.action ?? 'notify'}
              onChange={(e) => onChange({
                ...limits,
                children: {
                  count: limits?.children?.count ?? 0,
                  action: e.target.value as 'notify' | 'kill',
                },
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="notify">Notify</option>
              <option value="kill">Kill</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Process Limits</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              id="enable-limits"
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onConfigChange({
                ...config,
                enabled: e.target.checked,
              })}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <label htmlFor="enable-limits" className="ml-2">
              Enable Limits
            </label>
          </div>
          <button
            onClick={onApplyLimits}
            disabled={!config.enabled}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
          >
            Apply Limits
          </button>
        </div>
      </div>

      {config.enabled && (
        <div className="space-y-6">
          {/* Global Limits */}
          <div>
            <h3 className="text-lg font-medium mb-3">Global Limits</h3>
            {renderLimitControls(config.globalLimits, handleGlobalLimitChange)}
          </div>

          {/* Process-specific Limits */}
          <div>
            <h3 className="text-lg font-medium mb-3">Process-specific Limits</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <label htmlFor="process-name" className="sr-only">Process name</label>
                <input
                  id="process-name"
                  type="text"
                  placeholder="Process name"
                  value={selectedProcess}
                  onChange={(e) => setSelectedProcess(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  if (selectedProcess) {
                    handleProcessLimitChange(selectedProcess, {});
                    setSelectedProcess('');
                  }
                }}
                disabled={!selectedProcess}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                Add Process
              </button>
            </div>
            {Object.entries(config.processLimits).map(([processName, limits]) => (
              <div key={processName} className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{processName}</h4>
                  <button
                    onClick={() => {
                      const { [processName]: _, ...rest } = config.processLimits;
                      onConfigChange({
                        ...config,
                        processLimits: rest,
                      });
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
                {renderLimitControls(limits, (newLimits) => handleProcessLimitChange(processName, newLimits))}
              </div>
            ))}
          </div>

          {/* User-specific Limits */}
          <div>
            <h3 className="text-lg font-medium mb-3">User-specific Limits</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex-1">
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  if (selectedUser) {
                    handleUserLimitChange(selectedUser, {});
                    setSelectedUser('');
                  }
                }}
                disabled={!selectedUser}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
              >
                Add User
              </button>
            </div>
            {Object.entries(config.userLimits).map(([username, limits]) => (
              <div key={username} className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{username}</h4>
                  <button
                    onClick={() => {
                      const { [username]: _, ...rest } = config.userLimits;
                      onConfigChange({
                        ...config,
                        userLimits: rest,
                      });
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
                {renderLimitControls(limits, (newLimits) => handleUserLimitChange(username, newLimits))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
