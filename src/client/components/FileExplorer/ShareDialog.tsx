import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { ContentCopy, Close } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ShareAccessType } from '../../../server/routes/filesystem/dto/sharing.dto';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useCsrfToken } from '../../hooks/useCsrfToken';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  path: string;
  onShare: (shareConfig: any) => Promise<any>;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  path,
  onShare,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const { handleError } = useErrorHandler();
  const { csrfToken } = useCsrfToken();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accessType: ShareAccessType.READ,
    password: '',
    expiresAt: null as Date | null,
    maxAccesses: '',
    allowZipDownload: false,
  });

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        accessType: ShareAccessType.READ,
        password: '',
        expiresAt: null,
        maxAccesses: '',
        allowZipDownload: false,
      });
      setShareUrl(null);
      setError(null);
    }
  }, [open]);

  const validateForm = () => {
    if (formData.maxAccesses && parseInt(formData.maxAccesses) <= 0) {
      throw new Error('Maximum accesses must be greater than 0');
    }
    if (formData.expiresAt && formData.expiresAt < new Date()) {
      throw new Error('Expiration date must be in the future');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate form
      validateForm();

      const shareConfig = {
        path,
        ...formData,
        maxAccesses: formData.maxAccesses ? parseInt(formData.maxAccesses) : undefined,
        _csrf: csrfToken, // Add CSRF token
      };

      const result = await onShare(shareConfig);
      setShareUrl(result.url);
      enqueueSnackbar('Share created successfully', { 
        variant: 'success',
        autoHideDuration: 3000,
      });
    } catch (error) {
      setError(error.message || 'Failed to create share');
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        enqueueSnackbar('Share URL copied to clipboard', { 
          variant: 'success',
          autoHideDuration: 2000,
        });
      } catch (error) {
        handleError(error);
        enqueueSnackbar('Failed to copy URL to clipboard', { 
          variant: 'error',
          autoHideDuration: 3000,
        });
      }
    }
  };

  const handleClose = () => {
    setFormData({
      accessType: ShareAccessType.READ,
      password: '',
      expiresAt: null,
      maxAccesses: '',
      allowZipDownload: false,
    });
    setShareUrl(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      aria-labelledby="share-dialog-title"
    >
      <DialogTitle id="share-dialog-title">
        Share File
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            File: {path}
          </Typography>
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Access Type</InputLabel>
          <Select
            value={formData.accessType}
            onChange={(e) => setFormData({ ...formData, accessType: e.target.value as ShareAccessType })}
            label="Access Type"
            disabled={loading}
          >
            <MenuItem value={ShareAccessType.READ}>Read Only</MenuItem>
            <MenuItem value={ShareAccessType.WRITE}>Read & Write</MenuItem>
            <MenuItem value={ShareAccessType.FULL}>Full Access</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Password (Optional)"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <DateTimePicker
          label="Expires At (Optional)"
          value={formData.expiresAt}
          onChange={(date) => setFormData({ ...formData, expiresAt: date })}
          sx={{ mb: 2, width: '100%' }}
          disabled={loading}
          minDateTime={new Date()}
        />

        <TextField
          fullWidth
          label="Maximum Accesses (Optional)"
          type="number"
          value={formData.maxAccesses}
          onChange={(e) => setFormData({ ...formData, maxAccesses: e.target.value })}
          sx={{ mb: 2 }}
          disabled={loading}
          inputProps={{ min: 1 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formData.allowZipDownload}
              onChange={(e) => setFormData({ ...formData, allowZipDownload: e.target.checked })}
              disabled={loading}
            />
          }
          label="Allow Directory Download as ZIP"
        />

        {shareUrl && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Share URL:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {shareUrl}
              </Typography>
              <Tooltip title="Copy URL">
                <IconButton onClick={handleCopyUrl} size="small">
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {shareUrl ? 'Create Another Share' : 'Create Share'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
