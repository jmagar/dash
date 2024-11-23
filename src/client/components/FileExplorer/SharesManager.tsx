import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Tooltip,
  Chip,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  ContentCopy,
  Delete,
  Edit,
  Visibility,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { ShareStatus, ShareAccessType } from '../../../server/routes/filesystem/dto/sharing.dto';
import { ShareDialog } from './ShareDialog';

interface SharesManagerProps {
  onFetchShares: () => Promise<any>;
  onModifyShare: (shareId: string, modifications: any) => Promise<any>;
  onRevokeShare: (shareId: string) => Promise<any>;
}

export const SharesManager: React.FC<SharesManagerProps> = ({
  onFetchShares,
  onModifyShare,
  onRevokeShare,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedShare, setSelectedShare] = useState<any>(null);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const result = await onFetchShares();
      setShares(result.shares);
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to fetch shares', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    enqueueSnackbar('Share URL copied to clipboard', { variant: 'success' });
  };

  const handleRevoke = async (shareId: string) => {
    try {
      await onRevokeShare(shareId);
      enqueueSnackbar('Share revoked successfully', { variant: 'success' });
      fetchShares();
    } catch (error) {
      enqueueSnackbar(error.message || 'Failed to revoke share', { variant: 'error' });
    }
  };

  const getStatusColor = (status: ShareStatus) => {
    switch (status) {
      case ShareStatus.ACTIVE:
        return 'success';
      case ShareStatus.EXPIRED:
        return 'warning';
      case ShareStatus.REVOKED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getAccessTypeLabel = (type: ShareAccessType) => {
    switch (type) {
      case ShareAccessType.READ:
        return 'Read Only';
      case ShareAccessType.WRITE:
        return 'Read & Write';
      case ShareAccessType.FULL:
        return 'Full Access';
      default:
        return type;
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Shared Files
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Path</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Access Type</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Access Count</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : shares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No shares found
                </TableCell>
              </TableRow>
            ) : (
              shares
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((share) => (
                  <TableRow key={share.id}>
                    <TableCell>{share.path}</TableCell>
                    <TableCell>
                      <Chip
                        label={share.status}
                        color={getStatusColor(share.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getAccessTypeLabel(share.accessType)}</TableCell>
                    <TableCell>
                      {format(new Date(share.createdAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {share.expiresAt
                        ? format(new Date(share.expiresAt), 'MMM d, yyyy HH:mm')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {share.accessCount}
                      {share.maxAccesses && ` / ${share.maxAccesses}`}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Copy Share URL">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyUrl(share.url)}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {share.status === ShareStatus.ACTIVE && (
                          <>
                            <Tooltip title="Edit Share">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedShare(share);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Revoke Share">
                              <IconButton
                                size="small"
                                onClick={() => handleRevoke(share.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={shares.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      {selectedShare && (
        <ShareDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedShare(null);
          }}
          path={selectedShare.path}
          onShare={async (modifications) => {
            await onModifyShare(selectedShare.id, modifications);
            fetchShares();
            setEditDialogOpen(false);
            setSelectedShare(null);
          }}
        />
      )}
    </Box>
  );
};
