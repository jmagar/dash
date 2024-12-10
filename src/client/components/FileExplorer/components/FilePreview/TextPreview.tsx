import React from 'react';
import { Box, Typography } from '@mui/material';

interface TextPreviewProps {
  content: string;
}

export function TextPreview({ content }: TextPreviewProps) {
  return (
    <Box sx={{ p: 2, maxHeight: '80vh', overflow: 'auto' }}>
      <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </Typography>
    </Box>
  );
} 