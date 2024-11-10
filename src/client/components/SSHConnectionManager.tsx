import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { getHostStatus, connectHost, disconnectHost } from '../api';
import { useAsync } from '../hooks';
import type { Host } from '../../types';

interface Props {
  host: Host;
  onStatusChange?: (connected: boolean) => void;
}

export default function SSHConnectionManager({ host, onStatusChange }: Props): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async (): Promise<boolean> => {
    const result = await getHostStatus(host.id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to check connection status');
    }
    return result.data || false;
  };

  const {
    data: connected,
    loading: statusLoading,
    error: statusError,
    execute: refreshStatus,
  } = useAsync<boolean>(checkStatus, { immediate: true });

  const handleConnect = async (): Promise<void> => {
    setError(null);
    try {
      const result = await connectHost(host.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect');
      }
      void refreshStatus();
      onStatusChange?.(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    setError(null);
    try {
      const result = await disconnectHost(host.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect');
      }
      void refreshStatus();
      onStatusChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {host.name}
        </Typography>
        <Typography color="textSecondary" gutterBottom>
          {host.hostname}:{host.port}
        </Typography>

        {statusLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography
              color={connected ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 'bold' }}
            >
              {connected ? 'Connected' : 'Disconnected'}
            </Typography>
            <Button
              variant="contained"
              color={connected ? 'error' : 'primary'}
              onClick={connected ? handleDisconnect : handleConnect}
            >
              {connected ? 'Disconnect' : 'Connect'}
            </Button>
          </Box>
        )}

        {(error || statusError) && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error || statusError}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
