import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PDFPreview } from './PDFPreview';
import { MediaPreview } from './MediaPreview';
import { ImagePreview } from './ImagePreview';
import type { FileInfo } from './FileExplorer';

const MAX_TEXT_SIZE = 1024 * 1024; // 1MB
const TEXT_EXTENSIONS = [
  'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv',
  'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp',
  'css', 'scss', 'less', 'html', 'htm', 'sh', 'bash', 'zsh', 'fish',
  'conf', 'ini', 'cfg', 'log',
];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
const PDF_EXTENSIONS = ['pdf'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];

interface FilePreviewProps {
  open: boolean;
  file: FileInfo | null;
  hostId: string;
  onClose: () => void;
}

export function FilePreview({ open, file, hostId, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !open) {
      setContent(null);
      setError(null);
      return;
    }

    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`);
        const data = await response.json();

        if (data.success) {
          setContent(data.data);
        } else {
          setError(data.error || 'Failed to load file content');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load file content');
      } finally {
        setLoading(false);
      }
    };

    if (shouldLoadContent(file)) {
      void fetchContent();
    }
  }, [file, hostId, open]);

  const shouldLoadContent = (file: FileInfo) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return TEXT_EXTENSIONS.includes(ext) && file.size <= MAX_TEXT_SIZE;
  };

  const isImage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(ext);
  };

  const isPDF = (file: FileInfo) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return PDF_EXTENSIONS.includes(ext);
  };

  const isVideo = (file: FileInfo) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return VIDEO_EXTENSIONS.includes(ext);
  };

  const isAudio = (file: FileInfo) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return AUDIO_EXTENSIONS.includes(ext);
  };

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'rb':
        return 'ruby';
      case 'php':
        return 'php';
      case 'java':
        return 'java';
      case 'c':
      case 'cpp':
        return 'cpp';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
        return 'scss';
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'xml':
        return 'xml';
      case 'md':
        return 'markdown';
      case 'sh':
      case 'bash':
        return 'bash';
      default:
        return 'text';
    }
  };

  if (!file) return null;

  if (isImage(file.name)) {
    return (
      <ImagePreview
        src={`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`}
        alt={file.name}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          minHeight: '60vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {file.name}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : isPDF(file) ? (
          <PDFPreview
            url={`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`}
            maxHeight={800}
          />
        ) : isVideo(file) ? (
          <MediaPreview
            url={`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`}
            type="video"
            fileName={file.name}
          />
        ) : isAudio(file) ? (
          <MediaPreview
            url={`/api/hosts/${hostId}/files/content?path=${encodeURIComponent(file.path)}`}
            type="audio"
            fileName={file.name}
          />
        ) : content ? (
          <Box sx={{ fontSize: '0.9rem' }}>
            <SyntaxHighlighter
              language={getLanguage(file.name)}
              style={materialDark}
              customStyle={{
                margin: 0,
                borderRadius: 4,
                maxHeight: 'calc(90vh - 120px)',
              }}
            >
              {content}
            </SyntaxHighlighter>
          </Box>
        ) : (
          <Typography align="center" color="text.secondary">
            Preview not available for this file type
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
