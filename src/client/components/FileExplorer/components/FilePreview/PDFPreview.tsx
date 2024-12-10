import React from 'react';
import { Box } from '@mui/material';

interface PDFPreviewProps {
  url: string;
}

export function PDFPreview({ url }: PDFPreviewProps) {
  return (
    <Box sx={{ width: '100%', height: '80vh' }}>
      <iframe
        src={url}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="PDF Preview"
      />
    </Box>
  );
} 