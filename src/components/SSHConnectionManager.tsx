import {
  PowerSettingsNew as PowerIcon,
  Link as ConnectedIcon,
  LinkOff as DisconnectedIcon,
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import { connectHost, disconnectHost, getHostStatus } from '../api/hosts';
import type { Host } from '../types';

interface SSHConnectionManagerProps {
  hostId: number;
}

const SSHConnectionManager: React.FC<SSHConnectionManagerProps> = ({ hostId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async (): Promise<void> => {
      try {
        const result = await getHostStatus();
        if (result.success && result.data) {
          const host = result.data.find((h: Host) => h.id === hostId);
          if (host) {
            setIsConnected(host.isActive);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check host status');
      }
    };

    void checkStatus();
    // Poll for status updates
    const interval = setInterval(() => void checkStatus(), 30000);
    return () => clearInterval(interval);
  }, [hostId]);

  const connect = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);
      const result = await connectHost(hostId);
      if (result.success) {
        setIsConnected(true);
      } else {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);
      const result = await disconnectHost(hostId);
      if (result.success) {
        setIsConnected(false);
      } else {
        setError(result.error || 'Failed to disconnect');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isConnecting ? (
        <CircularProgress size={24} color="inherit" />
      ) : isConnected ? (
        <>
          <Tooltip title="Connected">
            <ConnectedIcon color="success" />
          </Tooltip>
          <Tooltip title={error || 'Disconnect'}>
            <IconButton
              color="inherit"
              onClick={(): void => void disconnect()}
              disabled={isConnecting}
            >
              <PowerIcon />
            </IconButton>
          </Tooltip>
        </>
      ) : (
        <>
          <Tooltip title="Disconnected">
            <DisconnectedIcon color="error" />
          </Tooltip>
          <Tooltip title={error || 'Connect'}>
            <IconButton
              color="inherit"
              onClick={(): void => void connect()}
              disabled={isConnecting}
            >
              <PowerIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  );
};

export default SSHConnectionManager;
