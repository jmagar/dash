import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import React, { useState } from 'react';

import { executeCommand } from '../api';
import { useAsync } from '../hooks';
import type { Command, CommandResult } from '../../types';
import LoadingScreen from './LoadingScreen';

interface Props {
  hostId: number;
}

export default function RemoteExecution({ hostId }: Props): JSX.Element {
  const [command, setCommand] = useState('');
  const [workingDirectory, setWorkingDirectory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const executeCommandAsync = async (): Promise<CommandResult> => {
    const cmd: Command = {
      command,
      workingDirectory: workingDirectory || undefined,
    };
    const result = await executeCommand(hostId, cmd);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to execute command');
    }
    return result.data;
  };

  const {
    execute,
    data: result,
    loading,
    error: asyncError,
  } = useAsync<CommandResult>(executeCommandAsync);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!command.trim()) {
      setError('Please enter a command');
      return;
    }
    try {
      await execute();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Remote Command Execution
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Working Directory"
            value={workingDirectory}
            onChange={(e): void => setWorkingDirectory(e.target.value)}
            margin="normal"
            placeholder="/path/to/directory"
          />
          <TextField
            fullWidth
            label="Command"
            value={command}
            onChange={(e): void => setCommand(e.target.value)}
            margin="normal"
            required
            placeholder="Enter command to execute"
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !command.trim()}
            sx={{ mt: 2 }}
          >
            Execute
          </Button>
        </form>
      </Paper>

      {loading && <LoadingScreen fullscreen={false} message="Executing command..." />}

      {(error || asyncError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || asyncError}
        </Alert>
      )}

      {result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Result
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 400,
            }}
          >
            {result.stdout && (
              <>
                <Typography variant="subtitle2" color="success.main">
                  Standard Output:
                </Typography>
                {result.stdout}
              </>
            )}
            {result.stderr && (
              <>
                <Typography variant="subtitle2" color="error" sx={{ mt: 2 }}>
                  Standard Error:
                </Typography>
                {result.stderr}
              </>
            )}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Exit Code: {result.exitCode}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
