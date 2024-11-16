import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Snackbar,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PowerSettingsNew,
  Refresh,
  Settings,
  Terminal,
  Storage,
  Speed,
  Memory,
  CloudUpload,
} from '@mui/icons-material';
import { logger } from '../utils/logger';
import { Host } from '../../types/models-shared';
import { getHostStatus, connectHost, disconnectHost } from '../api/hosts.client';
import { useHost } from '../hooks/useHost';

export function AgentConnectionManager() {
  const { hostId } = useParams<{ hostId: string }>();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: 'connect' | 'disconnect' }>({
    open: false,
    action: 'connect',
  });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const loadHostStatus = useCallback(async () => {
    if (!hostId) {
      setError('No host ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getHostStatus(hostId);
      setHost(data);
      setSnackbar({
        open: true,
        message: 'Host status updated',
        severity: 'success',
      });
    } catch (error) {
      logger.error('Failed to load host status:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to load host status');
      setSnackbar({
        open: true,
        message: 'Failed to load host status',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  const handleConnect = useCallback(async () => {
    if (!hostId) return;

    try {
      setLoading(true);
      setError(null);
      await connectHost(hostId);
      await loadHostStatus();
      setSnackbar({
        open: true,
        message: 'Agent connected successfully',
        severity: 'success',
      });
    } catch (error) {
      logger.error('Failed to connect agent:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to connect agent');
      setSnackbar({
        open: true,
        message: 'Failed to connect agent',
        severity: 'error',
      });
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: 'connect' });
    }
  }, [hostId, loadHostStatus]);

  const handleDisconnect = useCallback(async () => {
    if (!hostId) return;

    try {
      setLoading(true);
      setError(null);
      await disconnectHost(hostId);
      await loadHostStatus();
      setSnackbar({
        open: true,
        message: 'Agent disconnected successfully',
        severity: 'success',
      });
    } catch (error) {
      logger.error('Failed to disconnect agent:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to disconnect agent');
      setSnackbar({
        open: true,
        message: 'Failed to disconnect agent',
        severity: 'error',
      });
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: 'disconnect' });
    }
  }, [hostId, loadHostStatus]);

  useEffect(() => {
    void loadHostStatus();
  }, [loadHostStatus]);

  if (!hostId) {
    return <Typography color="error">No host ID provided</Typography>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'error';
      case 'connecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  const speedDialActions = [
    { icon: <Terminal />, name: 'Open Terminal', key: 'terminal' },
    { icon: <Storage />, name: 'View Storage', key: 'storage' },
    { icon: <Speed />, name: 'Performance', key: 'performance' },
    { icon: <Memory />, name: 'Memory Usage', key: 'memory' },
  ];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Agent Connection Manager
        </Typography>
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Refresh Status">
            <IconButton onClick={() => void loadHostStatus()}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <Settings />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      {host && (
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Typography variant="h6" gutterBottom>
                  {host.name}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography color="textSecondary">
                    {host.hostname}:{host.port}
                  </Typography>
                  <Chip
                    size="small"
                    label={host.status}
                    color={getStatusColor(host.status)}
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Last Updated: {new Date().toLocaleString()}
                </Typography>
              </Grid>
              <Grid item>
                {host.status === 'connected' ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<PowerSettingsNew />}
                    onClick={() => setConfirmDialog({ open: true, action: 'disconnect' })}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PowerSettingsNew />}
                    onClick={() => setConfirmDialog({ open: true, action: 'connect' })}
                  >
                    Connect
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.key}
            icon={action.icon}
            tooltipTitle={action.name}
          />
        ))}
      </SpeedDial>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => setMenuAnchor(null)}>Configure Agent</MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>View Logs</MenuItem>
        <MenuItem onClick={() => setMenuAnchor(null)}>Update Agent</MenuItem>
      </Menu>

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>
          Confirm {confirmDialog.action === 'connect' ? 'Connect' : 'Disconnect'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {confirmDialog.action} the agent?
            {confirmDialog.action === 'disconnect' &&
              ' This will terminate all active connections.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              confirmDialog.action === 'connect'
                ? void handleConnect()
                : void handleDisconnect()
            }
            autoFocus
            color={confirmDialog.action === 'connect' ? 'primary' : 'error'}
          >
            {confirmDialog.action === 'connect' ? 'Connect' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
