import { LoggingManager } from '../../server/utils/logging/LoggingManager'
import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Document, Page, pdfjs } from 'react-pdf';
import { logger } from '../utils/frontendLogger';
import type { FileInfo } from '../../types/files';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFPreviewProps {
  file: FileInfo;
  hostId: string;
  zoom: number;
  rotation: number;
  onError: (error: Error) => void;
}

export function PDFPreview({ file, hostId, zoom, rotation, onError }: PDFPreviewProps) {
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    logger.debug('PDF loaded successfully', {
      fileName: file.name,
      fileSize: file.size,
      numPages,
    });
    setNumPages(numPages);
    setLoading(false);
  };

  const handleLoadError = (error: Error) => {
    logger.error('PDF load error:', {
      error: error.message,
      fileName: file.name,
      fileSize: file.size,
      hostId,
    });
    setLoading(false);
    onError(error);
  };

  // Construct the PDF URL using the file service
  const pdfUrl = `/api/files/${hostId}/content${file.path}`;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
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
      <Document
        file={pdfUrl}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={handleLoadError}
        loading={null}
      >
        {numPages && Array.from(new Array(numPages)).map((_, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            scale={zoom}
            rotate={rotation}
            loading={null}
          />
        ))}
      </Document>
    </Box>
  );
}

