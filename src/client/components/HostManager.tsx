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
  const { metrics, loading: metricsLoading } = useHostMetrics({
    hostId,
    enabled: true,
  });

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
                <Typography>{formatBytes(metrics.network.bytesRecv)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Sent</Typography>
                <Typography>{formatBytes(metrics.network.bytesSent)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Connections</Typography>
                <Typography>
                  TCP: {metrics.network.tcpConns}, UDP: {metrics.network.udpConns}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Speed</Typography>
                <Typography>{formatBytes(metrics.network.averageSpeed)}/s</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
