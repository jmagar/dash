import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import React, { useState } from 'react';
import { useDockerUpdates, Stack } from 'src/hooks/useDockerUpdates';

export default function ComposePage() {
  // Use the custom hook to get real-time updates on stacks
  const { data: stacksData, loading, error } = useDockerUpdates('stacks');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [composeFile, setComposeFile] = useState('');

  // Type guard to ensure we're working with Stack type
  const isStack = (item: unknown): item is Stack =>
    typeof item === 'object' &&
    item !== null &&
    'name' in item &&
    'services' in item &&
    'status' in item;

  const stacks = stacksData.filter(isStack);

  // Function to handle stack actions (up, down, remove)
  const handleAction = async (name: string, action: string) => {
    try {
      const response = await fetch(`/api/stacks/${name}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Failed to ${action} stack`);
      }
      // The useDockerUpdates hook will automatically update the UI
    } catch (error) {
      console.error(`Error ${action} stack:`, error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  // Function to handle stack creation
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/stacks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newStackName, composeFile }),
      });
      if (!response.ok) {
        throw new Error('Failed to create stack');
      }
      setOpenCreateDialog(false);
      setNewStackName('');
      setComposeFile('');
      // The useDockerUpdates hook will automatically update the UI
    } catch (error) {
      console.error('Error creating stack:', error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">Error: {error}</Typography>;

  return (
    <React.Fragment>
      <Typography variant="h4" gutterBottom>
        Docker Compose Stacks
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={() => setOpenCreateDialog(true)}
        style={{ marginBottom: '1rem' }}
      >
        Create Stack
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Services</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stacks.map((stack: Stack) => (
              <TableRow key={stack.name}>
                <TableCell>{stack.name}</TableCell>
                <TableCell>{Object.keys(stack.services).join(', ')}</TableCell>
                <TableCell>{stack.status}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleAction(stack.name, 'up')}
                  >
                    Up
                  </Button>
                  <Button
                    startIcon={<StopIcon />}
                    onClick={() => handleAction(stack.name, 'down')}
                  >
                    Down
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={() => handleAction(stack.name, 'remove')}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Stack Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Create Stack</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="stackName"
            label="Stack Name"
            type="text"
            fullWidth
            variant="standard"
            value={newStackName}
            onChange={(e) => setNewStackName(e.target.value)}
          />
          <TextField
            margin="dense"
            id="composeFile"
            label="Docker Compose File"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={composeFile}
            onChange={(e) => setComposeFile(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
