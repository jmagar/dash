import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import type { Host, SystemStats } from '../../types';
import { getHostStatus, connectHost, disconnectHost } from '../api';
import { useAsync } from '../hooks';
import { logger } from '../utils/frontendLogger';

interface Props {
  host: Host;
  onStatusChange?: (connected: boolean) => void;
}

interface ConnectionStatus {
  stats: SystemStats;
  lastChecked: Date;
}

export default function SSHConnectionManager({ host, onStatusChange }: Props): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async (): Promise<ConnectionStatus> => {
    logger.info('Checking connection status', { hostId: String(host.id) });
    const result = await getHostStatus(host.id);
    if (!result.success || !result.data) {
      const errorMessage = result.error || 'Failed to check connection status';
      logger.error('Status check failed:', { error: errorMessage });
      throw new Error(errorMessage);
    }

    const status: ConnectionStatus = {
      stats: result.data,
      lastChecked: new Date(),
    };

    logger.info('Connection status checked', {
      hostId: String(host.id),
      stats: {
        cpu: status.stats.cpu,
        memory: status.stats.memory,
      },
    });
    return status;
  };

  const {
    data: status,
    loading: statusLoading,
    error: statusError,
    execute: refreshStatus,
  } = useAsync<ConnectionStatus>(checkStatus, { immediate: true });

  const handleConnect = async (): Promise<void> => {
    setError(null);
    try {
      logger.info('Connecting to host', { hostId: String(host.id) });
      const result = await connectHost(host.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to connect');
      }

      logger.info('Connected successfully', { hostId: String(host.id) });
      void refreshStatus();
      onStatusChange?.(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      logger.error('Connection failed:', { error: errorMessage });
      setError(errorMessage);
    }
  };

  const handleDisconnect = async (): Promise<void> => {
    setError(null);
    try {
      logger.info('Disconnecting from host', { hostId: String(host.id) });
      const result = await disconnectHost(host.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect');
      }

      logger.info('Disconnected successfully', { hostId: String(host.id) });
      void refreshStatus();
      onStatusChange?.(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      logger.error('Disconnection failed:', { error: errorMessage });
      setError(errorMessage);
    }
  };

  // Consider a host connected if we can get its stats
  const isConnected = !!status?.stats;

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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography
                color={isConnected ? 'success.main' : 'error.main'}
                sx={{ fontWeight: 'bold' }}
              >
                {isConnected ? 'Connected' : 'Disconnected'}
              </Typography>
              <Button
                variant="contained"
                color={isConnected ? 'error' : 'primary'}
                onClick={isConnected ? handleDisconnect : handleConnect}
              >
                {isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </Box>

            {status?.stats && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  CPU: {Math.round(status.stats.cpu * 100)}% | Memory:{' '}
                  {Math.round((status.stats.memory.used / status.stats.memory.total) * 100)}%
                </Typography>
                {status.lastChecked && (
                  <Typography variant="caption" color="textSecondary">
                    Last checked: {status.lastChecked.toLocaleTimeString()}
                  </Typography>
                )}
              </Box>
            )}
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
