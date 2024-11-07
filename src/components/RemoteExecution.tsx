import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  InputAdornment,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Search as SearchIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useAsync, useDebounce, useKeyPress } from '../hooks';
import { executeCommand, getCommandHistory } from '../api/remoteExecution';
import { Host, CommandHistory } from '../types';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';

const RemoteExecution: React.FC = () => {
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, { delay: 300 });

  const {
    data: history,
    loading: historyLoading,
    error: historyError,
    execute: loadHistory,
  } = useAsync<CommandHistory[]>(
    async () => {
      if (!selectedHost) {
        throw new Error('No host selected');
      }
      const response = await getCommandHistory(selectedHost.id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load command history');
      }
      return response.data;
    },
    {
      deps: [selectedHost?.id],
      immediate: !!selectedHost,
    }
  );

  const {
    loading: executeLoading,
    error: executeError,
    execute: runCommand,
  } = useAsync<void>(
    async () => {
      if (!selectedHost || !command.trim()) {
        throw new Error('Host or command not specified');
      }

      const response = await executeCommand(selectedHost.id, command);
      if (!response.success) {
        throw new Error(response.error || 'Failed to execute command');
      }

      setCommand('');
      void loadHistory();
    },
    {
      onError: (error) => {
        console.error('Failed to execute command:', error);
      },
    }
  );

  const handleHostSelect = (hosts: Host[]): void => {
    setSelectedHost(hosts[0]);
    setHostSelectorOpen(false);
  };

  const handleCommandSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void runCommand();
  };

  const handleHistoryClick = (cmd: string): void => {
    setCommand(cmd);
  };

  useKeyPress('Enter', (e) => {
    if (e.ctrlKey && command.trim()) {
      e.preventDefault();
      void runCommand();
    }
  });

  const filteredHistory = history?.filter((cmd) =>
    cmd.command.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={() => setHostSelectorOpen(true)}>
          Select Host
        </Button>
        <HostSelector
          open={hostSelectorOpen}
          onClose={() => setHostSelectorOpen(false)}
          onSelect={handleHostSelect}
          multiSelect={false}
        />
      </Box>
    );
  }

  if (executeLoading || historyLoading) {
    return <LoadingScreen fullscreen={false} message="Connecting to terminal..." />;
  }

  if (executeError || historyError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{executeError || historyError}</Typography>
        <Button variant="contained" onClick={() => void runCommand()}>
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">Remote Execution</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {selectedHost.name} - {selectedHost.hostname}:{selectedHost.port}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={() => void loadHistory()} disabled={historyLoading}>
          <HistoryIcon />
        </IconButton>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <form onSubmit={handleCommandSubmit}>
          <TextField
            fullWidth
            label="Command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={executeLoading}
            placeholder="Enter command (Ctrl+Enter to execute)"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => void runCommand()}
                    disabled={!command.trim() || executeLoading}
                    title="Execute (Ctrl+Enter)"
                  >
                    <PlayIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
        {executeError && (
          <Typography color="error" sx={{ mt: 1 }}>
            {executeError}
          </Typography>
        )}
      </Paper>

      <Paper>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Command History</Typography>
          <TextField
            size="small"
            placeholder="Search history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
        </Box>

        {historyLoading ? (
          <LoadingScreen fullscreen={false} message="Loading history..." />
        ) : historyError ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{historyError}</Typography>
            <Button variant="contained" onClick={() => void loadHistory()}>
              Retry
            </Button>
          </Box>
        ) : (
          <List>
            {filteredHistory?.map((cmd) => (
              <ListItem key={cmd.id}>
                <ListItemText
                  primary={cmd.command}
                  secondary={`Exit Code: ${cmd.exitCode} - ${new Date(
                    cmd.timestamp
                  ).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    onClick={() => handleHistoryClick(cmd.command)}
                    title="Use this command"
                  >
                    <PlayIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default RemoteExecution;
