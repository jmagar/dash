import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import type { FileInfo } from '../../../../../types/files';

interface CompressionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedFiles: FileInfo[];
  onCompress: (paths: string[], format: string) => Promise<void>;
}

export function CompressionDialog({
  open,
  onClose,
  selectedFiles,
  onCompress,
}: CompressionDialogProps) {
  const [format, setFormat] = useState('zip');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPaths = selectedFiles.map(file => file.path);

  const handleConfirm = () => {
    if (!selectedPaths.length) return;
    
    setLoading(true);
    setError(null);

    try {
      // Get base name from first file, fallback to 'archive' if not available
      const firstPath = selectedPaths[0];
      if (!firstPath) {
        throw new Error('No files selected');
      }
      
      const pathParts = firstPath.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      const baseName = lastPart ? lastPart.split('.')[0] : 'archive';
      const fileName = name || baseName;
      
      if (!fileName) {
        throw new Error('Invalid file name');
      }
      
      void onCompress(selectedPaths, format).then(() => {
        setLoading(false);
        onClose();
      }).catch((err) => {
        setError(err instanceof Error ? err.message : 'Operation failed');
        setLoading(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Compress Files</DialogTitle>
      <DialogContent>
        <TextField
          label="Archive Name"
          fullWidth
          margin="normal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter archive name (optional)"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Format</InputLabel>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            label="Format"
          >
            <MenuItem value="zip">ZIP</MenuItem>
            <MenuItem value="tar">TAR</MenuItem>
            <MenuItem value="gz">GZIP</MenuItem>
          </Select>
        </FormControl>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={loading || !selectedPaths.length}
        >
          Compress
        </Button>
      </DialogActions>
    </Dialog>
  );
} 