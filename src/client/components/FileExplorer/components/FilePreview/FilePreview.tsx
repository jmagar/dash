import React, { useState, useEffect } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { TextPreview } from './TextPreview';
import { ImagePreview } from './ImagePreview';
import { PDFPreview } from './PDFPreview';
import { MediaPreview } from './MediaPreview';
import { fileOperations } from '../../../../api/files.client';
import type { FilePreviewProps } from '../../types';

export function FilePreview({ file, hostId, open }: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      if (!file || !open) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fileOperations.listFiles(hostId, file.path);
        if (response?.data) {
          setContent(response.data.toString());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file content');
      } finally {
        setLoading(false);
      }
    }

    void loadContent();
  }, [file, hostId, open]);

  if (!file) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Determine file type based on extension
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
    return <ImagePreview src={content} alt={file.name} />;
  }

  // PDF files
  if (extension === 'pdf') {
    return <PDFPreview url={content} />;
  }

  // Video files
  if (['mp4', 'webm'].includes(extension)) {
    return <MediaPreview src={content} type={extension as 'mp4' | 'webm'} />;
  }

  // Audio files
  if (['mp3', 'wav'].includes(extension)) {
    return <MediaPreview src={content} type={extension as 'mp3' | 'wav'} />;
  }

  // Default to text preview for all other files
  return <TextPreview content={content} />;
} 