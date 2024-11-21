import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { logger } from '../utils/logger';
import type { FileInfo } from '../../types/files';

interface ImagePreviewProps {
  file: FileInfo;
  hostId: string;
  zoom: number;
  rotation: number;
  onError: (error: Error) => void;
}

export function ImagePreview({ file, hostId, zoom, rotation, onError }: ImagePreviewProps) {
  const [loading, setLoading] = React.useState(true);

  const handleLoad = () => {
    logger.debug('Image loaded successfully', {
      fileName: file.name,
      fileSize: file.size,
    });
    setLoading(false);
  };

  const handleError = () => {
    const error = new Error(`Failed to load image: ${file.name}`);
    logger.error('Image load error:', {
      error: error.message,
      fileName: file.name,
      fileSize: file.size,
      hostId,
    });
    setLoading(false);
    onError(error);
  };

  // Construct the image URL using the file service
  const imageUrl = `/api/files/${hostId}/content${file.path}`;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
          <IconButton onClick={() => {}} sx={{ mr: 1 }}>
            <ZoomIn />
          </IconButton>
          <IconButton onClick={() => {}} sx={{ mr: 1 }}>
            <ZoomOut />
          </IconButton>
          <IconButton onClick={() => {}}>
            <Close />
          </IconButton>
        </Box>

        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <img
            src={imageUrl}
            alt={file.name}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              objectFit: 'contain',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
