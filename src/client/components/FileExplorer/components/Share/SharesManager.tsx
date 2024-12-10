import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Share as ShareIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';
import type { ShareConfig, ShareInfoDto, ShareAccessType, SharePermission } from '../../../../../types/sharing';
import { useErrorHandler } from '../../../../hooks/useErrorHandler';
import { useCsrfToken } from '../../../../hooks/useCsrfToken';
import ShareDialog from './ShareDialog';

interface SharesManagerProps {
  path: string;
  shares: ShareInfoDto[];
  onShare: (config: ShareConfig) => Promise<{ url: string }>;
  onDelete: (shareId: string) => Promise<void>;
}

export default function SharesManager({
  path,
  shares,
  onShare,
  onDelete,
}: SharesManagerProps) {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { handleError } = useErrorHandler();

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      enqueueSnackbar('URL copied to clipboard', {
        variant: 'success',
        autoHideDuration: 3000,
      });
    } catch (err) {
      handleError(err);
    }
  }, [enqueueSnackbar, handleError]);

  const handleDelete = useCallback(async (shareId: string) => {
    try {
      await onDelete(shareId);
      enqueueSnackbar('Share deleted successfully', {
        variant: 'success',
        autoHideDuration: 3000,
      });
    } catch (err) {
      handleError(err);
    }
  }, [onDelete, enqueueSnackbar, handleError]);

  const formatAccessType = (type: ShareAccessType) => {
    switch (type) {
      case 'public':
        return 'Public';
      case 'password':
        return 'Password Protected';
      case 'private':
        return 'Private';
      default:
        return type;
    }
  };

  const formatPermission = (permission: SharePermission) => {
    switch (permission) {
      case 'read':
        return 'Read';
      case 'write':
        return 'Write';
      case 'full':
        return 'Full Access';
      default:
        return permission;
    }
  };

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Shares</Typography>
        <Button
          variant="contained"
          startIcon={<ShareIcon />}
          onClick={() => setShowShareDialog(true)}
        >
          Create Share
        </Button>
      </Box>

      {shares.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Access Type</TableCell>
                <TableCell>Permission</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Max Accesses</TableCell>
                <TableCell>Current Accesses</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shares.map((share) => (
                <TableRow key={share.id}>
                  <TableCell>{formatAccessType(share.accessType)}</TableCell>
                  <TableCell>{formatPermission(share.permission)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {share.url}
                      </Typography>
                      <Tooltip title="Copy URL">
                        <IconButton
                          size="small"
                          onClick={() => void handleCopyUrl(share.url)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {share.expiresAt
                      ? format(new Date(share.expiresAt), 'PPp')
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    {share.maxAccesses || 'Unlimited'}
                  </TableCell>
                  <TableCell>{share.currentAccesses}</TableCell>
                  <TableCell>
                    {format(new Date(share.createdAt), 'PPp')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Delete Share">
                      <IconButton
                        size="small"
                        onClick={() => void handleDelete(share.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body1" color="text.secondary" align="center">
          No shares created yet
        </Typography>
      )}

      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        path={path}
        onShare={onShare}
      />
    </>
  );
}
