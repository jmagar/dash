import React, { useState, useCallback } from 'react';
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
  SelectChangeEvent,
} from '@mui/material';
import { useCompression } from '../hooks/useCompression';
import { frontendLogger } from '../utils/frontendLogger';
import type { NotificationSeverity } from '../store/types';
import type { CompressionFormatValue, CompressionFormat } from '../../types/api/compression';

interface CompressionDialogProps {
  open: boolean;
  onClose: () => void;
  hostId: string;
  selectedPaths: string[];
  mode: 'compress' | 'extract';
  currentPath: string;
}

const compressionFormats: readonly CompressionFormat[] = [
  { value: 'zip', label: 'ZIP', mimeType: 'application/zip' },
  { value: 'tar', label: 'TAR', mimeType: 'application/x-tar' },
  { value: 'gz', label: 'GZIP', mimeType: 'application/gzip' },
  { value: 'bz2', label: 'BZIP2', mimeType: 'application/x-bzip2' },
] as const;

export const CompressionDialog: React.FC<CompressionDialogProps> = ({
  open,
  onClose,
  hostId,
  selectedPaths,
  mode,
  currentPath,
}) => {
  const [targetPath, setTargetPath] = useState('');
  const [format, setFormat] = useState<CompressionFormatValue>('zip');
  const { compressFiles, extractFiles } = useCompression();

  const handleFormatChange = useCallback((event: SelectChangeEvent<CompressionFormatValue>) => {
    setFormat(event.target.value as CompressionFormatValue);
  }, []);

  const handleTargetPathChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTargetPath(event.target.value);
  }, []);

  const getFormatFromFileName = useCallback((fileName: string): CompressionFormatValue | undefined => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return compressionFormats.find(f => f.value === extension)?.value;
  }, []);

  const validateTargetPath = useCallback((path: string): boolean => {
    if (!path.trim()) return false;
    if (mode === 'compress') {
      const format = getFormatFromFileName(path);
      return format !== undefined || !path.includes('.');
    }
    return true;
  }, [mode, getFormatFromFileName]);

  const handleSubmit = useCallback(async () => {
    if (!targetPath.trim()) {
      return;
    }

    try {
      frontendLogger.info('Starting compression operation', {
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

        await compressFiles(hostId, selectedPaths, finalTargetPath);
        onClose();
      } else {
        if (selectedPaths.length !== 1) {
          throw new Error('Can only extract one file at a time');
        }

        await extractFiles(hostId, selectedPaths[0], targetPath);
        onClose();
      }
    } catch (error) {
      frontendLogger.error('Compression operation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        mode,
        hostId,
        selectedPaths,
        targetPath,
      });
    }
  }, [
    targetPath,
    format,
    mode,
    hostId,
    selectedPaths,
    compressFiles,
    extractFiles,
    onClose,
  ]);

  const isPathValid = validateTargetPath(targetPath);

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
            <InputLabel id="compression-format-label">Format</InputLabel>
            <Select
              labelId="compression-format-label"
              value={format}
              label="Format"
              onChange={handleFormatChange}
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
          onChange={handleTargetPathChange}
          margin="normal"
          helperText={`Specify the ${
            mode === 'compress' ? 'archive' : 'destination'
          } path`}
          error={!isPathValid}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => void handleSubmit()}
          variant="contained"
          disabled={!isPathValid}
        >
          {mode === 'compress' ? 'Compress' : 'Extract'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
