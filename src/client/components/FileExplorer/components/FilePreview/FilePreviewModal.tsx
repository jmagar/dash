import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { FilePreview } from './FilePreview';
import type { FileInfo } from '../../../../../types/files';

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: FileInfo | null;
  hostId: string;
}

export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle>{file?.name}</DialogTitle>
      <DialogContent dividers>
        <FilePreview
          open={open}
          file={file}
          hostId={hostId}
          onClose={onClose}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
} 