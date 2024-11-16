import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material';
import React, { useState, useEffect } from 'react';

import type { SystemStats } from '../../types/models-shared';
import { getHostStats } from '../api/hosts.client';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/logger';

export function Dashboard(): JSX.Element {
  const { selectedHost } = useHost();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      if (!selectedHost) return;

      try {
        setLoading(true);
        setError(null);
        const hostStats = await getHostStats(selectedHost.id.toString());
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

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please select a host to view dashboard</Typography>
      </Box>
    );
  }

  if (loading && !stats) {
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

  if (!stats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No stats available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">CPU</Typography>
            <Typography variant="h4">
              {stats.cpu.usage.toFixed(1)}%
            </Typography>
            <Typography color="textSecondary">
              {stats.cpu.cores} cores
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Memory</Typography>
            <Typography variant="h4">
              {((stats.memory.used / stats.memory.total) * 100).toFixed(1)}%
            </Typography>
            <Typography color="textSecondary">
              {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Disk</Typography>
            <Typography variant="h4">
              {((stats.disk.used / stats.disk.total) * 100).toFixed(1)}%
            </Typography>
            <Typography color="textSecondary">
              {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Load Average</Typography>
            <Typography variant="h4">
              {stats.loadAvg[0].toFixed(2)}
            </Typography>
            <Typography color="textSecondary">
              {stats.loadAvg[1].toFixed(2)} / {stats.loadAvg[2].toFixed(2)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">System Information</Typography>
          <Typography>
            Host: {selectedHost.name} ({selectedHost.hostname}:{selectedHost.port})
          </Typography>
          <Typography>
            Status: {selectedHost.status}
          </Typography>
          <Typography>
            Uptime: {formatUptime(stats.uptime)}
          </Typography>
        </Paper>
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
