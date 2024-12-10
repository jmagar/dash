import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import type { FileInfo } from '../../../../../types/files';

interface DeleteDialogProps {
  open: boolean;
  files: FileInfo[];
  onClose: () => void;
  onConfirm: () => void;
  error?: string;
}

export function DeleteDialog({ open, files, onClose, onConfirm, error }: DeleteDialogProps) {
  const multipleFiles = files.length > 1;
  const fileName = files[0]?.name ?? 'file';
  const title = multipleFiles
    ? `Delete ${files.length} Items`
    : `Delete ${fileName}`;
  const message = multipleFiles
    ? `Are you sure you want to delete these ${files.length} items?`
    : `Are you sure you want to delete "${fileName}"?`;

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