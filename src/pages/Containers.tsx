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
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import TerminalIcon from '@mui/icons-material/Terminal';
import React, { useState } from 'react';
import Terminal from '../components/Terminal';
import { useDockerUpdates } from '../hooks/useDockerUpdates';
import { Container } from '../types';

export default function ContainersPage() {
  const { data: containers, loading, error } = useDockerUpdates({
    enabled: true,
    onUpdate: (data) => console.log('Containers updated:', data),
  });
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  const handleTerminalOpen = (containerId: string) => {
    setSelectedContainerId(containerId);
    setTerminalOpen(true);
  };

  const handleTerminalClose = () => {
    setTerminalOpen(false);
    setSelectedContainerId(null);
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
                      onClick={() => handleTerminalOpen(container.id)}
                      title="Open Terminal"
                    >
                      <TerminalIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      title="Delete"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
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
          {selectedContainerId && <Terminal host={{ id: 1, name: selectedContainerId, hostname: 'localhost', port: 22, ip: '127.0.0.1', isActive: true }} />}
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
