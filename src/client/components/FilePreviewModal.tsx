import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  useTheme,
  DialogActions,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { FileInfo } from './FileExplorer';
import { TextPreview } from './TextPreview';
import { ImagePreview } from './ImagePreview';
import { PDFPreview } from './PDFPreview';
import { MediaPreview } from './MediaPreview';
import { getFileType } from '../utils/fileUtils';
import { useSnackbar } from '../hooks/useSnackbar';
import { useLoadingOverlay } from '../hooks/useLoadingOverlay';
import { logger } from '../utils/logger';
import type { FileType } from '../../types/files';

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: FileInfo | null;
  hostId: string;
}

export function FilePreviewModal({ open, onClose, file, hostId }: FilePreviewModalProps) {
  const theme = useTheme();
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const { showSnackbar } = useSnackbar();
  const { showLoading, hideLoading } = useLoadingOverlay();
  const [error, setError] = React.useState<string | null>(null);

  const handleZoomIn = () => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 0.25, 3);
      logger.debug('Zooming in', { prevZoom: prev, newZoom });
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 0.25);
      logger.debug('Zooming out', { prevZoom: prev, newZoom });
      return newZoom;
    });
  };

  const handleRotateLeft = () => {
    setRotation((prev) => {
      const newRotation = (prev - 90) % 360;
      logger.debug('Rotating left', { prevRotation: prev, newRotation });
      return newRotation;
    });
  };

  const handleRotateRight = () => {
    setRotation((prev) => {
      const newRotation = (prev + 90) % 360;
      logger.debug('Rotating right', { prevRotation: prev, newRotation });
      return newRotation;
    });
  };

  const handleReset = () => {
    logger.debug('Resetting preview controls', { prevZoom: zoom, prevRotation: rotation });
    setZoom(1);
    setRotation(0);
  };

  const handleError = (error: Error) => {
    logger.error('Preview error:', {
      error: error.message,
      file: file?.name,
      hostId,
    });
    setError(error.message);
    showSnackbar('Failed to load preview', 'error');
  };

  React.useEffect(() => {
    if (open && file) {
      logger.info('Opening file preview', {
        fileName: file.name,
        fileType: getFileType(file.name),
        fileSize: file.size,
        hostId,
      });
    }
  }, [open, file, hostId]);

  if (!file) return null;

  const fileType = getFileType(file.name) as FileType;
  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf';
  const isText = fileType.startsWith('text/') || fileType === 'application/json';
  const isMedia = fileType.startsWith('video/') || fileType.startsWith('audio/');

  const renderPreview = () => {
    if (isImage) {
      return (
        <ImagePreview
          file={file}
          hostId={hostId}
          zoom={zoom}
          rotation={rotation}
          onError={handleError}
        />
      );
    }
    if (isPDF) {
      return (
        <PDFPreview
          file={file}
          hostId={hostId}
          zoom={zoom}
          rotation={rotation}
          onError={handleError}
        />
      );
    }
    if (isText) {
      return (
        <TextPreview
          file={file}
          hostId={hostId}
          onError={handleError}
        />
      );
    }
    if (isMedia) {
      return (
        <MediaPreview
          file={file}
          hostId={hostId}
          onError={handleError}
        />
      );
    }
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>
          Preview not available for this file type: {fileType}
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
          bgcolor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          {file.name}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              Failed to load preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
              {(isImage || isPDF) && (
                <>
                  <IconButton onClick={handleZoomIn} size="small" title="Zoom In">
                    <ZoomInIcon />
                  </IconButton>
                  <IconButton onClick={handleZoomOut} size="small" title="Zoom Out">
                    <ZoomOutIcon />
                  </IconButton>
                  <IconButton onClick={handleRotateLeft} size="small" title="Rotate Left">
                    <RotateLeftIcon />
                  </IconButton>
                  <IconButton onClick={handleRotateRight} size="small" title="Rotate Right">
                    <RotateRightIcon />
                  </IconButton>
                  <Button size="small" onClick={handleReset}>
                    Reset
                  </Button>
                </>
              )}
            </Box>

            <Box sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}>
              {renderPreview()}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
