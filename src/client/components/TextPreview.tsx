import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { logger } from '../utils/logger';
import type { FileInfo } from '../../types/files';

interface TextPreviewProps {
  file: FileInfo;
  hostId: string;
  onError: (error: Error) => void;
}

export function TextPreview({ file, hostId, onError }: TextPreviewProps) {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchContent = async () => {
      try {
        logger.debug('Fetching text content', {
          fileName: file.name,
          fileSize: file.size,
          hostId,
        });

        const response = await fetch(`/api/files/${hostId}/content${file.path}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        logger.debug('Text content loaded successfully', {
          fileName: file.name,
          contentLength: text.length,
        });
        
        setContent(text);
        setLoading(false);
      } catch (error) {
        logger.error('Failed to load text content:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileName: file.name,
          fileSize: file.size,
          hostId,
        });
        onError(error instanceof Error ? error : new Error('Failed to load text content'));
        setLoading(false);
      }
    };

    fetchContent();
  }, [file, hostId, onError]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        overflow: 'auto',
      }}
    >
      {loading ? (
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
      ) : (
        <pre
          style={{
            margin: 0,
            padding: '16px',
            width: '100%',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </pre>
      )}
    </Box>
  );
}
