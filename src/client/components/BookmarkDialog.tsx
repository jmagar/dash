import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { FileInfo } from './FileExplorer';

interface BookmarkDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (file: FileInfo, notes: string) => void;
  file: FileInfo;
  existingNotes?: string;
}

export function BookmarkDialog({
  open,
  onClose,
  onConfirm,
  file,
  existingNotes = '',
}: BookmarkDialogProps) {
  const [notes, setNotes] = useState(existingNotes);

  const handleConfirm = () => {
    onConfirm(file, notes);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {existingNotes ? 'Edit Bookmark' : 'Add Bookmark'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {file.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {file.path}
          </Typography>
        </Box>
        <TextField
          label="Notes"
          multiline
          rows={4}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this bookmark..."
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          {existingNotes ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
