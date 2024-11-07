import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import React, { useState } from 'react';
import { useDockerUpdates } from '../hooks/useDockerUpdates';
import { Stack } from '../types';

export default function ComposePage() {
  const { data: stacks, loading, error } = useDockerUpdates({
    enabled: true,
    onUpdate: (data) => console.log('Stacks updated:', data),
  });
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newStackName, setNewStackName] = useState('');
  const [composeFile, setComposeFile] = useState('');

  const handleCreateStack = () => {
    // TODO: Implement stack creation
    console.log('Creating stack:', { name: newStackName, compose: composeFile });
    setOpenCreateDialog(false);
    setNewStackName('');
    setComposeFile('');
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading stacks...</Typography>
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Docker Compose Stacks</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Create Stack
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Services</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(stacks as Stack[])?.map((stack) => (
                <TableRow key={stack.name}>
                  <TableCell>{stack.name}</TableCell>
                  <TableCell>{stack.services}</TableCell>
                  <TableCell>{stack.status}</TableCell>
                  <TableCell>
                    {new Date(stack.created).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      startIcon={stack.status === 'running' ? <StopIcon /> : <PlayArrowIcon />}
                      color="primary"
                    >
                      {stack.status === 'running' ? 'Stop' : 'Start'}
                    </Button>
                    <Button
                      startIcon={<DeleteIcon />}
                      color="error"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Stack</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Stack Name"
            fullWidth
            value={newStackName}
            onChange={(e) => setNewStackName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Docker Compose File"
            multiline
            rows={10}
            fullWidth
            value={composeFile}
            onChange={(e) => setComposeFile(e.target.value)}
            placeholder="version: '3'\nservices:\n  ..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateStack}
            variant="contained"
            disabled={!newStackName || !composeFile}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
