import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { useHost } from '../hooks/useHost';
import { useHostMetrics } from '../hooks/useHostMetrics';
import { formatBytes, formatPercent } from '../utils/formatters';

interface HostManagerProps {
  hostId: string;
}

export function HostManager({ hostId }: HostManagerProps) {
  const theme = useTheme();
  const { host, loading: hostLoading } = useHost({ hostId });
  const { metrics, loading: metricsLoading } = useHostMetrics(hostId);

  if (hostLoading || metricsLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!host) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Host not found
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No metrics available
      </Alert>
    );
  }

  // Update network metrics to use correct field names
  const networkData = [
    {
      name: 'Current',
      received: metrics.network.rx_bytes,
      sent: metrics.network.tx_bytes,
    },
  ];

  const connectionData = [
    {
      name: 'Current',
      tcp: metrics.network.tcp_conns,
      udp: metrics.network.udp_conns,
    },
  ];

  const speedData = [
    {
      name: 'Current',
      speed: metrics.network.average_speed,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* CPU Usage */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SpeedIcon color="primary" />
              <Typography variant="h6">CPU Usage</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Total</Typography>
                <Typography>{formatPercent(metrics.cpu.total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">User</Typography>
                <Typography>{formatPercent(metrics.cpu.user)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">System</Typography>
                <Typography>{formatPercent(metrics.cpu.system)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Cores</Typography>
                <Typography>{metrics.cpu.cores}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MemoryIcon color="primary" />
              <Typography variant="h6">Memory Usage</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Total</Typography>
                <Typography>{formatBytes(metrics.memory.total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Used</Typography>
                <Typography>{formatBytes(metrics.memory.used)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Free</Typography>
                <Typography>{formatBytes(metrics.memory.free)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Usage</Typography>
                <Typography>{formatPercent(metrics.memory.usage)}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Storage Usage */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <StorageIcon color="primary" />
              <Typography variant="h6">Storage Usage</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Total</Typography>
                <Typography>{formatBytes(metrics.storage.total)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Used</Typography>
                <Typography>{formatBytes(metrics.storage.used)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Free</Typography>
                <Typography>{formatBytes(metrics.storage.free)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Usage</Typography>
                <Typography>{formatPercent(metrics.storage.usage)}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Network Usage */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <NetworkIcon color="primary" />
              <Typography variant="h6">Network Usage</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Received</Typography>
                <Typography>{formatBytes(networkData[0].received)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Sent</Typography>
                <Typography>{formatBytes(networkData[0].sent)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Connections</Typography>
                <Typography>
                  TCP: {connectionData[0].tcp}, UDP: {connectionData[0].udp}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Speed</Typography>
                <Typography>{formatBytes(speedData[0].speed)}/s</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
