import React, { useCallback, useState, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Alert,
  Typography,
} from '@mui/material';
import type { DropzoneOptions, FileRejection } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useUploadFile } from '../../hooks/useFileUpload';
import type { UploadState } from '../../types/uploads';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Common file types and their MIME types
const ACCEPTED_FILE_TYPES = {
  // Images
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  // Text
  'text/plain': ['.txt'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'text/javascript': ['.js'],
  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  // Audio
  'audio/*': ['.mp3', '.wav', '.ogg'],
  // Video
  'video/*': ['.mp4', '.avi', '.mov', '.wmv'],
};

interface FileUploadDialogProps {
  open: boolean;
  currentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  currentPath,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'fileExplorer.upload',
  });
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const currentFileRef = useRef<File | null>(null);
  const { uploadFile, cancelUpload, isUploading } = useUploadFile();

  const handleClose = useCallback(() => {
    if (isUploading) {
      cancelUpload();
    }
    setError(null);
    setProgress(0);
    setUploadState('idle');
    setRetryCount(0);
    currentFileRef.current = null;
    onClose();
  }, [isUploading, cancelUpload, onClose]);

  const handleRetry = useCallback(() => {
    const file = currentFileRef.current;
    if (!file) return;

    setError(null);
    setProgress(0);
    setUploadState('uploading');
    
    void (async () => {
      try {
        await uploadFile({
          file,
          path: currentPath,
          onProgress: (uploadProgress: number) => setProgress(uploadProgress),
        });
        setUploadState('success');
        onSuccess();
        handleClose();
      } catch (error) {
        console.error('Upload retry failed:', error);
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          // Schedule next retry
          setTimeout(handleRetry, RETRY_DELAY);
        } else {
          setError(`Upload failed after ${MAX_RETRIES} retries. ${error instanceof Error ? error.message : ''}`);
          setUploadState('error');
        }
      }
    })();
  }, [currentPath, handleClose, onSuccess, uploadFile, retryCount]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const errors = fileRejections.map(rejection => 
          `${rejection.file.name}: ${rejection.errors.map(e => e.message).join(', ')}`
        );
        setError(`Invalid file(s): ${errors.join('; ')}`);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      currentFileRef.current = file;
      setError(null);
      setProgress(0);
      setRetryCount(0);
      setUploadState('uploading');
      
      void (async () => {
        try {
          await uploadFile({
            file,
            path: currentPath,
            onProgress: (uploadProgress: number) => setProgress(uploadProgress),
          });
          setUploadState('success');
          onSuccess();
          handleClose();
        } catch (error) {
          console.error('Upload failed:', error);
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            // Schedule retry
            setTimeout(handleRetry, RETRY_DELAY);
          } else {
            setError(`Upload failed after ${MAX_RETRIES} retries. ${error instanceof Error ? error.message : ''}`);
            setUploadState('error');
          }
        }
      })();
    },
    [currentPath, handleClose, onSuccess, uploadFile, retryCount, handleRetry]
  );

  const dropzoneConfig: DropzoneOptions = {
    onDrop,
    multiple: false,
    maxFiles: 1,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneConfig);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('title')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed #ccc',
            borderRadius: '4px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>{t('dropHere')}</p>
          ) : (
            <>
              <p>{t('dragOrClick')}</p>
              <Typography variant="caption" color="textSecondary">
                Supported file types: {Object.values(ACCEPTED_FILE_TYPES).flat().join(', ')}
              </Typography>
            </>
          )}
        </div>
        {uploadState === 'uploading' && (
          <>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ mt: 2 }}
            />
            {retryCount > 0 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Retry attempt {retryCount} of {MAX_RETRIES}...
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {isUploading ? t('cancel') : t('common:close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadDialog; 