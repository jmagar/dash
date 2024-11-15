import React, { useState } from 'react';

import type { CommandRequest, CommandResult } from '../../types/models-shared';
import { executeCommand } from '../api/remoteExecution.client';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/logger';

export function RemoteExecution() {
  const { selectedHost } = useHost();
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHost) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const cmd: CommandRequest = {
        command,
        args: [],
        cwd: workingDir || undefined,
      };

      const response = await executeCommand(selectedHost.id, cmd);
      setResult(response);

      if (response.status === 'failed') {
        setError('Command execution failed');
      }
    } catch (error) {
      logger.error('Command execution failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError('Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedHost) {
    return <div>Please select a host first</div>;
  }

  return (
    <div className="remote-execution">
      <form onSubmit={handleSubmit}>
        <h2>Remote Command Execution</h2>
        {error && <div className="error">{error}</div>}
        <div>
          <label htmlFor="command">Command</label>
          <input
            type="text"
            id="command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div>
          <label htmlFor="workingDir">Working Directory</label>
          <input
            type="text"
            id="workingDir"
            value={workingDir}
            onChange={(e) => setWorkingDir(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Executing...' : 'Execute'}
        </button>
      </form>

      {result && (
        <div className="result">
          <h3>Result</h3>
          <div className="status">
            Status: {result.status}
          </div>
          {result.stdout && (
            <div className="stdout">
              <h4>Output</h4>
              <pre>{result.stdout}</pre>
            </div>
          )}
          {result.stderr && (
            <div className="stderr">
              <h4>Error Output</h4>
              <pre>{result.stderr}</pre>
            </div>
          )}
          {result.completedAt && result.startedAt && (
            <div className="duration">
              Duration: {Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000)}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}
