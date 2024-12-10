import React from 'react';
import { Box } from '@mui/material';

interface MediaPreviewProps {
  src: string;
  type: 'mp4' | 'webm' | 'mp3' | 'wav';
}

export function MediaPreview({ src, type }: MediaPreviewProps) {
  const isVideo = type === 'mp4' || type === 'webm';

  return (
    <Box sx={{ width: '100%', height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {isVideo ? (
        <video controls style={{ maxWidth: '100%', maxHeight: '100%' }}>
          <source src={src} type={`video/${type}`} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <audio controls style={{ width: '100%' }}>
          <source src={src} type={`audio/${type}`} />
          Your browser does not support the audio tag.
        </audio>
      )}
    </Box>
  );
} 