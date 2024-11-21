import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Box,
} from '@mui/material';
import { compressionApi } from '../api/compression';
import { useSnackbar } from '../hooks/useSnackbar';
import { useLoadingOverlay } from '../hooks/useLoadingOverlay';
import { logger } from '../utils/logger';

interface CompressionDialogProps {
  open: boolean;
  onClose: () => void;
  hostId: string;
  selectedPaths: string[];
  mode: 'compress' | 'extract';
  currentPath: string;
}

const compressionFormats = [
  { value: 'zip', label: 'ZIP' },
  { value: 'tar', label: 'TAR' },
  { value: 'gz', label: 'GZIP' },
  { value: 'bz2', label: 'BZIP2' },
];

export const CompressionDialog: React.FC<CompressionDialogProps> = ({
  open,
  onClose,
  hostId,
  selectedPaths,
  mode,
  currentPath,
}) => {
  const [targetPath, setTargetPath] = useState('');
  const [format, setFormat] = useState('zip');
  const { showSnackbar } = useSnackbar();
  const { showLoading, hideLoading } = useLoadingOverlay();

  const handleSubmit = async () => {
    try {
      showLoading();
      logger.info('Starting compression operation', {
        mode,
        hostId,
        selectedPaths,
        targetPath,
        format: mode === 'compress' ? format : undefined,
      });

      if (mode === 'compress') {
        const finalTargetPath = targetPath.endsWith(`.${format}`)
          ? targetPath
          : `${targetPath}.${format}`;
        await compressionApi.compressFiles(hostId, selectedPaths, finalTargetPath);
        logger.info('Files compressed successfully', {
          targetPath: finalTargetPath,
          count: selectedPaths.length,
        });
        showSnackbar('Files compressed successfully', 'success');
      } else {
        await compressionApi.extractFiles(hostId, selectedPaths[0], targetPath);
        logger.info('Files extracted successfully', {
          sourcePath: selectedPaths[0],
          targetPath,
        });
        showSnackbar('Files extracted successfully', 'success');
      }
      onClose();
    } catch (error) {
      logger.error('Compression operation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode,
        hostId,
        selectedPaths,
        targetPath,
      });
      showSnackbar('Failed to process files', 'error');
    } finally {
      hideLoading();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'compress' ? 'Compress Files' : 'Extract Files'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected items:
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {selectedPaths.join(', ')}
          </Typography>
        </Box>

        {mode === 'compress' && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={format}
              label="Format"
              onChange={(e) => setFormat(e.target.value)}
            >
              {compressionFormats.map((fmt) => (
                <MenuItem key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          fullWidth
          label="Target Path"
          value={targetPath}
          onChange={(e) => setTargetPath(e.target.value)}
          margin="normal"
          helperText={`Specify the ${
            mode === 'compress' ? 'archive' : 'destination'
          } path`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!targetPath}
        >
          {mode === 'compress' ? 'Compress' : 'Extract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
