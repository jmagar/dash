import React, { useState, useEffect } from 'react';
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
import type { FileInfo } from '../../../../../types/files';

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  error?: string;
}

export function NewFolderDialog({ open, onClose, onConfirm, error }: NewFolderDialogProps) {
  const [name, setName] = useState('');

  const handleConfirm = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onConfirm(trimmedName);
      setName('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
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
          onKeyPress={handleKeyPress}
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
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (file?.name) {
      setNewName(file.name);
    }
  }, [file]);

  const handleConfirm = () => {
    const trimmedName = newName.trim();
    if (trimmedName && file?.name && trimmedName !== file.name) {
      onConfirm(trimmedName);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
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
          onKeyPress={handleKeyPress}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!newName.trim() || (file?.name && newName.trim() === file.name)}
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
  const firstFile = files[0];
  
  const title = multipleFiles
    ? `Delete ${files.length} Items`
    : firstFile ? `Delete ${firstFile.name}` : 'Delete Item';
    
  const message = multipleFiles
    ? `Are you sure you want to delete these ${files.length} items?`
    : firstFile ? `Are you sure you want to delete "${firstFile.name}"?` : 'Are you sure you want to delete this item?';

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
