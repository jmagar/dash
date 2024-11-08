import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Alert, IconButton } from '@mui/material';
import * as React from 'react';

import { createStack, deleteStack, startStack, stopStack, getStackComposeFile, updateStackComposeFile } from '../api/docker';
import CodeEditor from '../components/CodeEditor';
import { useDockerUpdates } from '../hooks';
import type { Stack } from '../types';

export default function ComposePage(): JSX.Element {
  const { data: rawStacks, loading, error, refetch } = useDockerUpdates({
    enabled: true,
    type: 'stacks',
  });

  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [openEditDialog, setOpenEditDialog] = React.useState(false);
  const [selectedStack, setSelectedStack] = React.useState<Stack | null>(null);
  const [newStackName, setNewStackName] = React.useState('');
  const [composeFile, setComposeFile] = React.useState('');
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleCreateStack = async (): Promise<void> => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await createStack(newStackName, composeFile);
      if (result.success) {
        setOpenCreateDialog(false);
        setNewStackName('');
        setComposeFile('');
        void refetch();
      } else {
        setActionError(result.error || 'Failed to create stack');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create stack');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStack = async (name: string): Promise<void> => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await deleteStack(name);
      if (result.success) {
        void refetch();
      } else {
        setActionError(result.error || 'Failed to delete stack');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete stack');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStackAction = async (name: string, action: 'start' | 'stop'): Promise<void> => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await (action === 'start' ? startStack(name) : stopStack(name));
      if (result.success) {
        void refetch();
      } else {
        setActionError(result.error || `Failed to ${action} stack`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} stack`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditStack = async (stack: Stack): Promise<void> => {
    try {
      setActionLoading(true);
      setActionError(null);
      const result = await getStackComposeFile(stack.name);
      if (result.success && result.data) {
        setSelectedStack(stack);
        setComposeFile(result.data);
        setOpenEditDialog(true);
      } else {
        setActionError(result.error || 'Failed to load compose file');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to load compose file');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveComposeFile = async (content: string): Promise<void> => {
    if (!selectedStack) return;

    try {
      const result = await updateStackComposeFile(selectedStack.name, content);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update compose file');
      }
      void refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update compose file');
    }
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

  // Since we specified type: 'stacks', we know this is Stack[]
  const stacks = (rawStacks || []) as Stack[];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Docker Compose Stacks</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={(): void => setOpenCreateDialog(true)}
          disabled={actionLoading}
        >
          Create Stack
        </Button>
      </Box>

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
              <TableCell>Services</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stacks.map((stack) => (
              <TableRow key={stack.name}>
                <TableCell>{stack.name}</TableCell>
                <TableCell>{stack.services}</TableCell>
                <TableCell>{stack.status}</TableCell>
                <TableCell>
                  {new Date(stack.created).toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    color="primary"
                    onClick={(): void => void handleEditStack(stack)}
                    disabled={actionLoading}
                    title="Edit compose file"
                  >
                    <EditIcon />
                  </IconButton>
                  <Button
                    startIcon={stack.status === 'running' ? <StopIcon /> : <PlayArrowIcon />}
                    color="primary"
                    onClick={(): void => void handleStackAction(
                      stack.name,
                      stack.status === 'running' ? 'stop' : 'start',
                    )}
                    disabled={actionLoading}
                  >
                    {stack.status === 'running' ? 'Stop' : 'Start'}
                  </Button>
                  <Button
                    startIcon={<DeleteIcon />}
                    color="error"
                    onClick={(): void => void handleDeleteStack(stack.name)}
                    disabled={actionLoading}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {stacks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary">
                    No stacks found. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openCreateDialog}
        onClose={(): void => setOpenCreateDialog(false)}
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
            onChange={(e): void => setNewStackName(e.target.value)}
            sx={{ mb: 2 }}
            disabled={actionLoading}
          />
          <TextField
            label="Docker Compose File"
            multiline
            rows={10}
            fullWidth
            value={composeFile}
            onChange={(e): void => setComposeFile(e.target.value)}
            placeholder="version: '3'\nservices:\n  ..."
            disabled={actionLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={(): void => setOpenCreateDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={(): void => void handleCreateStack()}
            variant="contained"
            disabled={actionLoading || !newStackName || !composeFile}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {selectedStack && (
        <CodeEditor
          open={openEditDialog}
          onClose={(): void => {
            setOpenEditDialog(false);
            setSelectedStack(null);
            setComposeFile('');
          }}
          onSave={handleSaveComposeFile}
          initialContent={composeFile}
          title={`${selectedStack.name} - docker-compose.yml`}
          language="yaml"
          files={stacks.map((stack) => ({
            name: `${stack.name} - docker-compose.yml`,
            content: '', // Content will be loaded when selected
          }))}
          onFileChange={(fileName: string): void => {
            const stackName = fileName.split(' - ')[0];
            const stack = stacks.find((s) => s.name === stackName);
            if (stack) {
              void handleEditStack(stack);
            }
          }}
        />
      )}
    </Box>
  );
}
