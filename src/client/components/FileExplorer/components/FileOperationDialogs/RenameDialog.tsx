import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import type { FileInfo } from '../../../../../types/files';

interface RenameDialogProps {
  open: boolean;
  file: FileInfo | null;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  error?: string;
}

export function RenameDialog({ open, file, onClose, onConfirm, error }: RenameDialogProps) {
  const [newName, setNewName] = useState(file?.name || '');

  useEffect(() => {
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