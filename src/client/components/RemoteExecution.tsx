import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import React, { useState } from 'react';

import type { Command, CommandResult } from '../../types';
import { executeCommand } from '../api';
import { useAsync } from '../hooks';
import LoadingScreen from './LoadingScreen';
import { logger } from '../utils/frontendLogger';

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

    logger.info('Executing command', { command: cmd.command, workingDirectory: cmd.workingDirectory });
    const result = await executeCommand(hostId, cmd);
    if (!result.success || !result.data) {
      const errorMessage = result.error || 'Failed to execute command';
      logger.error('Command execution failed:', { error: errorMessage });
      throw new Error(errorMessage);
    }

    logger.info('Command executed successfully', {
      exitCode: result.data.exitCode,
      hasStdout: !!result.data.stdout,
      hasStderr: !!result.data.stderr,
    });
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
      const errorMessage = 'Please enter a command';
      logger.warn('Command submission failed:', { error: errorMessage });
      setError(errorMessage);
      return;
    }

    try {
      await execute();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      logger.error('Command execution error:', { error: errorMessage });
      setError(errorMessage);
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
