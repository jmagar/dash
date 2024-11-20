import React, { useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface MediaPreviewProps {
  url: string;
  type: 'video' | 'audio';
  fileName: string;
}

export function MediaPreview({ url, type, fileName }: MediaPreviewProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = () => {
    setError(`Failed to load ${type} file`);
  };

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {type === 'video' ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          controls
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(90vh - 120px)',
          }}
          onError={handleError}
        >
          <source src={url} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          controls
          style={{ width: '100%', maxWidth: '500px' }}
          onError={handleError}
        >
          <source src={url} />
          Your browser does not support the audio tag.
        </audio>
      )}
      <Typography variant="caption" color="text.secondary">
        {fileName}
      </Typography>
    </Box>
  );
}
