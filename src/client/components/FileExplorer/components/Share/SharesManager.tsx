import React, { useState, useCallback } from 'react';
import {
  Button,
  IconButton,
  Typography,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useErrorHandler } from '../../../../hooks/useErrorHandler';
import { useNotification } from '../../../../hooks/useNotification';
import type { ShareConfig, ShareInfoDto } from '../../../../../types/sharing';
import { ShareAccessType, SharePermission } from '../../../../../types/sharing';
import { format } from 'date-fns';
import ShareDialog from './ShareDialog';

interface SharesManagerProps {
  path: string;
  shares: ShareInfoDto[];
  onShare: (config: ShareConfig) => Promise<{ url: string }>;
  onDelete: (shareId: string) => Promise<void>;
  onEdit?: (shareId: string, config: ShareConfig) => Promise<void>;
}

export default function SharesManager({
  path,
  shares,
  onShare,
  onDelete,
  onEdit,
}: SharesManagerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedShare, setSelectedShare] = useState<ShareInfoDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { handleError } = useErrorHandler();
  const { showNotification } = useNotification();

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showNotification('URL copied to clipboard', 'success');
    } catch (err) {
      handleError(err);
    }
  }, [showNotification, handleError]);

  const handleDelete = useCallback(async (shareId: string) => {
    try {
      await onDelete(shareId);
      showNotification('Share deleted successfully', 'success');
    } catch (err) {
      handleError(err);
      setError(err instanceof Error ? err.message : 'Failed to delete share');
    }
  }, [onDelete, showNotification, handleError]);

  const handleEdit = useCallback((shareId: string) => {
    const share = shares.find(s => s.id === shareId);
    if (share) {
      setSelectedShare(share);
      setShowEditDialog(true);
    }
  }, [shares]);

  const handleEditSubmit = useCallback(async (config: ShareConfig) => {
    if (!selectedShare || !onEdit) return;
    
    try {
      await onEdit(selectedShare.id, config);
      showNotification('Share updated successfully', 'success');
      setShowEditDialog(false);
      setSelectedShare(null);
    } catch (err) {
      handleError(err);
      setError(err instanceof Error ? err.message : 'Failed to update share');
    }
  }, [selectedShare, onEdit, showNotification, handleError]);

  const formatAccessType = (type: ShareAccessType) => {
    switch (type) {
      case ShareAccessType.PUBLIC:
        return 'Public';
      case ShareAccessType.PASSWORD:
        return 'Password Protected';
      case ShareAccessType.PRIVATE:
        return 'Private';
      default:
        return type;
    }
  };

  const formatPermission = (permission: SharePermission) => {
    switch (permission) {
      case SharePermission.READ:
        return 'Read';
      case SharePermission.WRITE:
        return 'Write';
      case SharePermission.FULL:
        return 'Full Access';
      default:
        return permission;
    }
  };

  const renderMobileView = () => (
    <List>
      {shares.map((share) => (
        <ListItem key={share.id}>
          <ListItemText
            primary={share.url}
            secondary={
              <>
                {formatAccessType(share.accessType)} • {formatPermission(share.permission)}
                <br />
                {share.expiresAt
                  ? `Expires: ${format(new Date(share.expiresAt), 'PPp')}`
                  : 'Never expires'}
              </>
            }
          />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              onClick={() => void handleCopyUrl(share.url)}
              size="small"
            >
              <CopyIcon />
            </IconButton>
            {onEdit && (
              <IconButton
                edge="end"
                onClick={() => void handleEdit(share.id)}
                size="small"
              >
                <EditIcon />
              </IconButton>
            )}
            <IconButton
              edge="end"
              onClick={() => void handleDelete(share.id)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
    </List>
  );

  const renderDesktopView = () => (
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
                {onEdit && (
                  <Tooltip title="Edit Share">
                    <IconButton
                      size="small"
                      onClick={() => void handleEdit(share.id)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
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
  );

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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {shares.length > 0 ? (
        isMobile ? renderMobileView() : renderDesktopView()
      ) : (
        <Typography variant="body1" color="text.secondary" align="center">
          No shares created yet
        </Typography>
      )}

      <ShareDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        path={path}
        onSubmit={onShare}
        mode="create"
      />

      {selectedShare && onEdit && (
        <ShareDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setSelectedShare(null);
          }}
          path={path}
          initialConfig={{
            accessType: selectedShare.accessType,
            permission: selectedShare.permission,
            expiresAt: selectedShare.expiresAt,
            ...(selectedShare.accessType === ShareAccessType.PASSWORD ? { password: '' } : {}),
          }}
          onSubmit={handleEditSubmit}
          mode="edit"
        />
      )}
    </>
  );
}
