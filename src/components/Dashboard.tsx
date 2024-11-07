import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Computer as ComputerIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { useAsync, useThrottle, useIntersectionObserver } from '../hooks';
import { getSystemStats, getHostStatus } from '../api/hosts';
import { Host, SystemStats } from '../types';
import LoadingScreen from './LoadingScreen';

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
};

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress?: number;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, progress }) => (
  <ListItem>
    <ListItemIcon>{icon}</ListItemIcon>
    <ListItemText primary={label} secondary={value} />
    {progress !== undefined && (
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ width: 100, ml: 2 }}
      />
    )}
  </ListItem>
);

interface HostCardProps {
  host: Host;
}

const HostCard: React.FC<HostCardProps> = ({ host }) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '50px',
  });

  const {
    data: stats,
    loading,
    error,
    execute: loadStats,
  } = useAsync<SystemStats>(
    async () => {
      if (!isVisible) {
        throw new Error('Host card not visible');
      }
      const response = await getSystemStats(host.id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load system stats');
      }
      return response.data;
    },
    {
      deps: [isVisible],
      immediate: isVisible,
    }
  );

  const throttledStats = useThrottle(stats, 1000);

  return (
    <Card ref={ref}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ComputerIcon sx={{ mr: 1 }} />
          <Typography variant="h6">{host.name}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={() => void loadStats()}
            disabled={loading}
            title="Refresh stats"
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        {loading ? (
          <LinearProgress />
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : throttledStats ? (
          <List dense>
            <StatItem
              icon={<MemoryIcon />}
              label="CPU Usage"
              value={`${throttledStats.cpu.toFixed(1)}%`}
              progress={throttledStats.cpu}
            />
            <StatItem
              icon={<StorageIcon />}
              label="Memory"
              value={`${formatBytes(throttledStats.memory.used)} / ${formatBytes(
                throttledStats.memory.total
              )}`}
              progress={(throttledStats.memory.used / throttledStats.memory.total) * 100}
            />
            <StatItem
              icon={<StorageIcon />}
              label="Disk"
              value={`${formatBytes(throttledStats.disk.used)} / ${formatBytes(
                throttledStats.disk.total
              )}`}
              progress={(throttledStats.disk.used / throttledStats.disk.total) * 100}
            />
            <StatItem
              icon={<NetworkIcon />}
              label="Network"
              value={`↓ ${formatBytes(throttledStats.network.rx)}/s  ↑ ${formatBytes(
                throttledStats.network.tx
              )}/s`}
            />
          </List>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const {
    data: hosts,
    loading,
    error,
    execute: loadHosts,
  } = useAsync<Host[]>(
    async () => {
      const response = await getHostStatus();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load hosts');
      }
      return response.data;
    },
    {
      immediate: true,
    }
  );

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Loading hosts..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => void loadHosts()}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        System Dashboard
      </Typography>

      <Grid container spacing={3}>
        {hosts?.map((host) => (
          <Grid item xs={12} md={6} lg={4} key={host.id}>
            <HostCard host={host} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
