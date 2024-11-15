import { Box, Button, Typography, CircularProgress } from '@mui/material';
import React, { useState, useEffect } from 'react';

import type { SystemStats } from '../../types/models-shared';
import { getHost, getHostStats } from '../api/hosts.client';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/logger';

interface SSHConnectionManagerProps {
  hostId: number;
}

export function SSHConnectionManager({ hostId }: SSHConnectionManagerProps): JSX.Element {
  const { selectedHost, setSelectedHost } = useHost();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHost() {
      try {
        setLoading(true);
        setError(null);
        const host = await getHost(hostId);
        setSelectedHost(host);
      } catch (err) {
        logger.error('Failed to load host:', {
          hostId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Failed to load host');
      } finally {
        setLoading(false);
      }
    }

    void loadHost();
  }, [hostId, setSelectedHost]);

  useEffect(() => {
    async function loadStats() {
      if (!selectedHost) return;

      try {
        setLoading(true);
        setError(null);
        const hostStats = await getHostStats(selectedHost.id);
        setStats(hostStats);
      } catch (err) {
        logger.error('Failed to load host stats:', {
          hostId: selectedHost.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Failed to load host stats');
      } finally {
        setLoading(false);
      }
    }

    const interval = setInterval(() => {
      void loadStats();
    }, 5000);

    void loadStats();

    return () => clearInterval(interval);
  }, [selectedHost]);

  if (loading && !selectedHost) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No host selected</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6">{selectedHost.name}</Typography>
      <Typography color="textSecondary">
        {selectedHost.hostname}:{selectedHost.port}
      </Typography>

      {stats && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">System Stats</Typography>
          <Typography>
            CPU Usage: {stats.cpu.usage.toFixed(1)}% ({stats.cpu.cores} cores)
          </Typography>
          <Typography>
            Memory: {formatBytes(stats.memory.used)}/{formatBytes(stats.memory.total)} (
            {((stats.memory.used / stats.memory.total) * 100).toFixed(1)}%)
          </Typography>
          <Typography>
            Disk: {formatBytes(stats.disk.used)}/{formatBytes(stats.disk.total)} (
            {((stats.disk.used / stats.disk.total) * 100).toFixed(1)}%)
          </Typography>
          <Typography>Uptime: {formatUptime(stats.uptime)}</Typography>
          <Typography>Load Average: {stats.loadAvg.join(', ')}</Typography>
        </Box>
      )}

      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={(): void => {
            // Handle connect/disconnect
          }}
        >
          {selectedHost.status === 'connected' ? 'Disconnect' : 'Connect'}
        </Button>
      </Box>
    </Box>
  );
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}
