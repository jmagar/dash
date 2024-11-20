import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import type { FileInfo } from './FileExplorer';

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  error?: string;
}

export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Folder</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          label="Folder Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface RenameDialogProps {
  open: boolean;
  file: FileInfo | null;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  error?: string;
}

export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {
  const [newName, setNewName] = useState(file?.name || '');

  React.useEffect(() => {
    setNewName(file?.name || '');
  }, [file]);

  const handleConfirm = () => {
    if (newName.trim() && newName !== file?.name) {
      onConfirm(newName.trim());
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rename {file?.name}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          label="New Name"
          fullWidth
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!newName.trim() || newName === file?.name}
        >
          Rename
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  files: FileInfo[];
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
}

export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {
  const multipleFiles = files.length > 1;
  const title = multipleFiles
    ? `Delete ${files.length} Items`
    : `Delete ${files[0]?.name}`;
  const message = multipleFiles
    ? `Are you sure you want to delete these ${files.length} items?`
    : `Are you sure you want to delete "${files[0]?.name}"?`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography>{message}</Typography>
        <Typography color="error" sx={{ mt: 2 }}>
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
