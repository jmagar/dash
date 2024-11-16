import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import { Refresh, PowerSettingsNew } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import {
  connectHost,
  disconnectHost,
  getHostStatus,
} from '../api/hosts.client';
import type { Host } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

export function SSHConnectionManager() {
  const { hostId } = useParams<{ hostId: string }>();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (error) {
      logger.error('Failed to load host status:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to load host status');
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
    } catch (error) {
      logger.error('Failed to connect host:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to connect host');
    } finally {
      setLoading(false);
    }
  }, [hostId, loadHostStatus]);

  const handleDisconnect = useCallback(async () => {
    if (!hostId) return;

    try {
      setLoading(true);
      setError(null);
      await disconnectHost(hostId);
      await loadHostStatus();
    } catch (error) {
      logger.error('Failed to disconnect host:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
      });
      setError('Failed to disconnect host');
    } finally {
      setLoading(false);
    }
  }, [hostId, loadHostStatus]);

  useEffect(() => {
    void loadHostStatus();
  }, [loadHostStatus]);

  if (!hostId) {
    return <Typography color="error">No host ID provided</Typography>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          SSH Connection Manager
        </Typography>
        <IconButton onClick={() => void loadHostStatus()}>
          <Refresh />
        </IconButton>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Typography>Loading...</Typography>
      ) : host ? (
        <Card>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs>
                <Typography variant="h6" gutterBottom>
                  {host.name}
                </Typography>
                <Typography color="textSecondary">
                  {host.hostname}:{host.port}
                </Typography>
                <Typography color="textSecondary">
                  Status: {host.status}
                </Typography>
              </Grid>
              <Grid item>
                {host.status === 'connected' ? (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<PowerSettingsNew />}
                    onClick={() => void handleDisconnect()}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<PowerSettingsNew />}
                    onClick={() => void handleConnect()}
                  >
                    Connect
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Typography>Host not found</Typography>
      )}
    </Box>
  );
}
