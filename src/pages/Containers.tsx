import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TerminalIcon from '@mui/icons-material/Terminal';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import React, { useState } from 'react';
import Terminal from 'src/components/Terminal';
import { useDockerUpdates, Container } from 'src/hooks/useDockerUpdates';

export default function ContainersPage() {
  const { data: containersData, loading, error } = useDockerUpdates('containers');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  const handleAction = async (id: string, action: string) => {
    try {
      const response = await fetch(`/api/containers/${id}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} container`);
      }
    } catch (error) {
      console.error(`Error ${action} container:`, error);
    }
  };

  const handleOpenTerminal = (id: string) => {
    setSelectedContainerId(id);
    setTerminalOpen(true);
  };

  // Type guard to ensure we're working with Container type
  const isContainer = (item: unknown): item is Container =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'name' in item &&
    'image' in item &&
    'status' in item &&
    'state' in item;

  const containers = containersData.filter(isContainer);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">Error: {error}</Typography>;

  return (
    <React.Fragment>
      <Typography variant="h4" gutterBottom>
        Containers
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containers.map((container: Container) => (
              <TableRow key={container.id}>
                <TableCell>{container.id.substring(0, 12)}</TableCell>
                <TableCell>{container.name}</TableCell>
                <TableCell>{container.image}</TableCell>
                <TableCell>{container.status}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleAction(container.id, 'start')}
                    disabled={container.state === 'running'}
                  >
                    Start
                  </Button>
                  <Button
                    startIcon={<StopIcon />}
                    onClick={() => handleAction(container.id, 'stop')}
                    disabled={container.state !== 'running'}
                  >
                    Stop
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => handleAction(container.id, 'remove')}
                    disabled={container.state === 'running'}
                  >
                    Remove
                  </Button>
                  <Button
                    startIcon={<TerminalIcon />}
                    onClick={() => handleOpenTerminal(container.id)}
                    disabled={container.state !== 'running'}
                  >
                    Terminal
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Terminal - Container {selectedContainerId}</DialogTitle>
        <DialogContent>
          {selectedContainerId && <Terminal containerId={selectedContainerId} />}
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
