
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';

import { executeCommand } from '../api/remoteExecution';
import { useAsync } from '../hooks';
import type { CommandResult } from '../types';

interface RemoteExecutionProps {
  hostId: number;
}

interface SavedCommand {
  id: string;
  command: string;
  description?: string;
}

export default function RemoteExecution({ hostId }: RemoteExecutionProps): JSX.Element {
  const [command, setCommand] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);

  const {
    data: commandResult,
    loading,
    error,
    execute: runCommand,
  } = useAsync<CommandResult>(
    async (): Promise<CommandResult> => {
      const result = await executeCommand(hostId, command);
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute command');
      }
      if (!result.data) {
        throw new Error('No command result returned');
      }
      return result.data;
    },
    { immediate: false },
  );

  const handleCommandChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setCommand(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setDescription(e.target.value);
  };

  const handleExecute = async (): Promise<void> => {
    try {
      await runCommand();
    } catch (err) {
      console.error('Failed to execute command:', err);
    }
  };

  const handleSaveCommand = (): void => {
    if (!command) return;

    const newCommand: SavedCommand = {
      id: Date.now().toString(),
      command,
      description,
    };

    setSavedCommands((prev) => [...prev, newCommand]);
    setCommand('');
    setDescription('');
  };

  const handleDeleteSavedCommand = (id: string): void => {
    setSavedCommands((prev) => prev.filter((cmd) => cmd.id !== id));
  };

  const handleLoadSavedCommand = (savedCommand: SavedCommand): void => {
    setCommand(savedCommand.command);
    setDescription(savedCommand.description || '');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Command"
            value={command}
            onChange={handleCommandChange}
            disabled={loading}
          />
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleExecute}
            disabled={loading || !command}
          >
            Execute
          </Button>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveCommand}
            disabled={!command}
          >
            Save
          </Button>
        </Box>
        <TextField
          fullWidth
          label="Description (Optional)"
          value={description}
          onChange={handleDescriptionChange}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {commandResult && (
          <Box>
            <Typography variant="h6">Output:</Typography>
            <pre>{commandResult.stdout || commandResult.stderr}</pre>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Saved Commands</Typography>
        <List>
          {savedCommands.length === 0 ? (
            <ListItem>
              <ListItemText primary="No saved commands" />
            </ListItem>
          ) : (
            savedCommands.map((savedCmd) => (
              <ListItem
                key={savedCmd.id}
                button
                onClick={(): void => handleLoadSavedCommand(savedCmd)}
              >
                <ListItemText
                  primary={savedCmd.command}
                  secondary={savedCmd.description}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(): void => handleDeleteSavedCommand(savedCmd.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
}
