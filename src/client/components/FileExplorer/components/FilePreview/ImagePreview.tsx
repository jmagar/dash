import React from 'react';
import { Box } from '@mui/material';

interface ImagePreviewProps {
  src: string;
  alt: string;
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  return (
    <Box sx={{ 
      width: '100%', 
      height: '80vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      overflow: 'auto'
    }}>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
    </Box>
  );
} 