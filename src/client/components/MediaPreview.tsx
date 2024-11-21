import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { logger } from '../utils/logger';
import type { FileInfo } from '../../types/files';

interface MediaPreviewProps {
  file: FileInfo;
  hostId: string;
  onError: (error: Error) => void;
}

export function MediaPreview({ file, hostId, onError }: MediaPreviewProps) {
  const [loading, setLoading] = React.useState(true);
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const handleLoad = () => {
    logger.debug('Media loaded successfully', {
      fileName: file.name,
      fileSize: file.size,
      type: file.name.endsWith('.mp4') || file.name.endsWith('.webm') ? 'video' : 'audio',
    });
    setLoading(false);
  };

  const handleError = () => {
    const error = new Error(`Failed to load media: ${file.name}`);
    logger.error('Media load error:', {
      error: error.message,
      fileName: file.name,
      fileSize: file.size,
      hostId,
      type: file.name.endsWith('.mp4') || file.name.endsWith('.webm') ? 'video' : 'audio',
    });
    setLoading(false);
    onError(error);
  };

  // Construct the media URL using the file service
  const mediaUrl = `/api/files/${hostId}/content${file.path}`;
  const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.webm');

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <CircularProgress />
        </Box>
      )}
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={mediaUrl}
          controls
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          onLoadedData={handleLoad}
          onError={handleError}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={mediaUrl}
          controls
          style={{
            width: '100%',
            maxWidth: '600px',
          }}
          onLoadedData={handleLoad}
          onError={handleError}
        >
          Your browser does not support the audio tag.
        </audio>
      )}
    </Box>
  );
}
