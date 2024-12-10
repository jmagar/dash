import React, { useState } from 'react';
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
  FormHelperText,
  IconButton,
  InputAdornment,
  Box,
  Alert,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import {
  ContentCopy,
  Close,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { ShareAccessType, SharePermission, type ShareConfig } from '../../../../../types/sharing';
import { useErrorHandler } from '../../../../hooks/useErrorHandler';
import { useCsrfToken } from '../../../../hooks/useCsrfToken';

interface ShareDialogProps {
  open: boolean;
  path: string;
  onClose: () => void;
  onShare: (config: ShareConfig) => Promise<{ url: string }>;
  error?: string;
}

export default function ShareDialog({ open, path, onClose, onShare, error: propError }: ShareDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { handleError } = useErrorHandler();
  const { csrfToken } = useCsrfToken();

  const [formData, setFormData] = useState<Omit<ShareConfig, 'path' | '_csrf'>>({
    accessType: ShareAccessType.PUBLIC,
    permission: SharePermission.READ,
    expiresAt: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(propError || null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const validateForm = () => {
    if (!path) {
      throw new Error('Path is required');
    }

    if (formData.accessType === ShareAccessType.PASSWORD && !formData.password) {
      throw new Error('Password is required for password-protected shares');
    }

    if (formData.maxAccesses !== undefined && formData.maxAccesses <= 0) {
      throw new Error('Max accesses must be greater than 0');
    }
  };

  const handleSubmit = async () => {
    try {
      validateForm();

      setLoading(true);
      setError(null);

      const shareConfig: ShareConfig = {
        path,
        ...formData,
        _csrf: csrfToken || undefined,
      };

      const result = await onShare(shareConfig);
      setShareUrl(result.url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create share';
      setError(errorMessage);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      enqueueSnackbar('URL copied to clipboard', {
        variant: 'success',
        autoHideDuration: 3000,
      });
    } catch (err) {
      handleError(err);
      enqueueSnackbar('Failed to copy URL', {
        variant: 'error',
        autoHideDuration: 3000,
      });
    }
  };

  const handleClose = () => {
    setError(null);
    setShareUrl(null);
    setFormData({
      accessType: ShareAccessType.PUBLIC,
      permission: SharePermission.READ,
      expiresAt: null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share {path}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {shareUrl ? (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Share URL"
              value={shareUrl}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => void handleCopyUrl()}>
                      <ContentCopy />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        ) : (
          <>
            <FormControl fullWidth margin="normal">
              <InputLabel>Access Type</InputLabel>
              <Select
                value={formData.accessType}
                label="Access Type"
                onChange={(e) => setFormData({ ...formData, accessType: e.target.value as ShareAccessType })}
                disabled={loading}
              >
                <MenuItem value={ShareAccessType.PUBLIC}>Public</MenuItem>
                <MenuItem value={ShareAccessType.PASSWORD}>Password Protected</MenuItem>
                <MenuItem value={ShareAccessType.PRIVATE}>Private</MenuItem>
              </Select>
            </FormControl>

            {formData.accessType === ShareAccessType.PASSWORD && (
              <TextField
                fullWidth
                margin="normal"
                label="Password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Permission</InputLabel>
              <Select
                value={formData.permission}
                label="Permission"
                onChange={(e) => setFormData({ ...formData, permission: e.target.value as SharePermission })}
                disabled={loading}
              >
                <MenuItem value={SharePermission.READ}>Read</MenuItem>
                <MenuItem value={SharePermission.WRITE}>Write</MenuItem>
                <MenuItem value={SharePermission.FULL}>Full Access</MenuItem>
              </Select>
            </FormControl>

            <DateTimePicker
              label="Expires At"
              value={formData.expiresAt}
              onChange={(date) => setFormData({ ...formData, expiresAt: date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                },
              }}
              disabled={loading}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Max Accesses"
              type="number"
              value={formData.maxAccesses || ''}
              onChange={(e) => setFormData({ ...formData, maxAccesses: Number(e.target.value) || undefined })}
              disabled={loading}
              inputProps={{ min: 1 }}
              helperText="Leave empty for unlimited accesses"
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {shareUrl ? 'Close' : 'Cancel'}
        </Button>
        {!shareUrl && (
          <Button
            onClick={() => void handleSubmit()}
            variant="contained"
            disabled={loading}
          >
            Share
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
