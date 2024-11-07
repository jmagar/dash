import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TerminalIcon from '@mui/icons-material/Terminal';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
} from '@mui/material';
import React, { useState } from 'react';

import { startContainer, stopContainer, deleteContainer } from '../api/docker';
import Terminal from '../components/Terminal';
import { useDockerUpdates } from '../hooks/useDockerUpdates';
import type { Container } from '../types';

export default function ContainersPage(): JSX.Element {
  const { data: containers, loading, error, refetch } = useDockerUpdates({
    enabled: true,
    type: 'containers',
  });

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleTerminalOpen = (containerId: string): void => {
    setSelectedContainerId(containerId);
    setTerminalOpen(true);
  };

  const handleTerminalClose = (): void => {
    setTerminalOpen(false);
    setSelectedContainerId(null);
  };

  const handleContainerAction = async (id: string, action: 'start' | 'stop'): Promise<void> => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await (action === 'start' ? startContainer(id) : stopContainer(id));
      if (result.success) {
        void refetch();
      } else {
        setActionError(result.error || `Failed to ${action} container`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} container`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContainer = async (id: string): Promise<void> => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await deleteContainer(id);
      if (result.success) {
        void refetch();
      } else {
        setActionError(result.error || 'Failed to delete container');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete container');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading containers...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <React.Fragment>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Containers
        </Typography>

        {actionError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={(): void => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Ports</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(containers as Container[])?.map((container) => (
                <TableRow key={container.id}>
                  <TableCell>{container.name}</TableCell>
                  <TableCell>{container.image}</TableCell>
                  <TableCell>{container.status}</TableCell>
                  <TableCell>{container.state}</TableCell>
                  <TableCell>
                    {new Date(container.created).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {container.ports.join(', ')}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={(): void => void handleContainerAction(
                        container.id,
                        container.state === 'running' ? 'stop' : 'start',
                      )}
                      disabled={actionLoading}
                      title={container.state === 'running' ? 'Stop' : 'Start'}
                    >
                      {container.state === 'running' ? (
                        <StopIcon />
                      ) : (
                        <PlayArrowIcon />
                      )}
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={(): void => handleTerminalOpen(container.id)}
                      disabled={actionLoading}
                      title="Open Terminal"
                    >
                      <TerminalIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={(): void => void handleDeleteContainer(container.id)}
                      disabled={actionLoading}
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(!containers || containers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">
                      No containers found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog
        open={terminalOpen}
        onClose={handleTerminalClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Terminal - Container {selectedContainerId}</DialogTitle>
        <DialogContent>
          {selectedContainerId && (
            <Terminal
              host={{
                id: 1,
                name: selectedContainerId,
                hostname: 'localhost',
                port: 22,
                ip: '127.0.0.1',
                isActive: true,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
