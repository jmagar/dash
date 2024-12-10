import React, { useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
  currentPath: string;
}

export function FileUploadDialog({
  open,
  onClose,
  onUpload,
  currentPath,
}: FileUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(event.target.files);
      setError(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles) return;

    try {
      setUploading(true);
      setError(null);
      await onUpload(selectedFiles);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  }, [selectedFiles, onUpload, onClose]);

  const handleRemoveFile = useCallback((index: number) => {
    if (!selectedFiles) return;

    const dt = new DataTransfer();
    Array.from(selectedFiles)
      .filter((_, i) => i !== index)
      .forEach(file => dt.items.add(file));
    
    setSelectedFiles(dt.files);
  }, [selectedFiles]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Files</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload location: {currentPath}
          </Typography>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          multiple
        />

        {!selectedFiles && (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 1 }} />
            <Typography>
              Click to select files or drag and drop them here
            </Typography>
          </Box>
        )}

        {selectedFiles && (
          <List>
            {Array.from(selectedFiles).map((file, index) => (
              <ListItem key={`${file.name}-${index}`}>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024).toFixed(1)} KB`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(index)}
                    disabled={uploading}
                  >
                    <CloseIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!selectedFiles || uploading}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
} 