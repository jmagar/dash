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
import { useCompression } from '../../../../hooks/useCompression';

interface CompressionDialogProps {
  open: boolean;
  onClose: () => void;
  hostId: string;
  selectedPaths: string[];
  mode: 'compress' | 'extract';
  currentPath: string;
}

export function CompressionDialog({
  open,
  onClose,
  hostId,
  selectedPaths,
  mode,
  currentPath,
}: CompressionDialogProps): JSX.Element {
  const [targetPath, setTargetPath] = useState(currentPath);
  const [format, setFormat] = useState('zip');
  const { compressFiles, extractFiles } = useCompression();

  const handleSubmit = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!targetPath.trim() || selectedPaths.length === 0) return;

    const submitOperation = async () => {
      try {
        if (mode === 'compress') {
          const fileName = selectedPaths[0].split('/').pop();
          if (!fileName) {
            throw new Error('Invalid file name');
          }
          const archivePath = `${targetPath}/${fileName}.${format}`;
          await compressFiles(hostId, selectedPaths, archivePath);
        } else {
          const sourcePath = selectedPaths[0];
          if (!sourcePath) {
            throw new Error('No file selected for extraction');
          }
          await extractFiles(hostId, sourcePath, targetPath);
        }
        onClose();
      } catch (error) {
        // Error handling is done in useCompression hook
      }
    };

    void submitOperation();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'compress' ? 'Compress Files' : 'Extract Archive'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Target Path"
          fullWidth
          value={targetPath}
          onChange={(e) => setTargetPath(e.target.value)}
          sx={{ mb: 2 }}
        />
        {mode === 'compress' && (
          <FormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value)}
            >
              <MenuItem value="zip">ZIP</MenuItem>
              <MenuItem value="tar">TAR</MenuItem>
              <MenuItem value="gz">GZIP</MenuItem>
              <MenuItem value="bz2">BZIP2</MenuItem>
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!targetPath.trim() || selectedPaths.length === 0}
        >
          {mode === 'compress' ? 'Compress' : 'Extract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 