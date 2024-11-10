import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
import React from 'react';

import type { SystemStats } from '../../types';
import { getSystemStats, getHostStatus } from '../api';
import { useAsync, useThrottle } from '../hooks';
import LoadingScreen from './LoadingScreen';

interface Props {
  hostId: number;
}

interface StatCardProps {
  title: string;
  value: number;
  total?: number;
  unit: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, total, unit }) => {
  const percentage = total ? (value / total) * 100 : value;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1">
          {value.toFixed(1)} {unit}
          {total && ` / ${total.toFixed(1)} ${unit}`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={Math.min(percentage, 100)}
          sx={{ mt: 1 }}
        />
      </CardContent>
    </Card>
  );
};

export default function Dashboard({ hostId }: Props): JSX.Element {
  const loadStats = async (): Promise<SystemStats> => {
    const result = await getSystemStats(hostId);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load system stats');
    }
    return result.data;
  };

  const checkStatus = async (): Promise<boolean> => {
    const result = await getHostStatus(hostId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to check host status');
    }
    return result.data || false;
  };

  const throttledLoadStats = useThrottle(loadStats, 5000);

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
  } = useAsync<SystemStats>(throttledLoadStats, { immediate: true });

  const {
    data: connected,
    loading: statusLoading,
    error: statusError,
  } = useAsync<boolean>(checkStatus, { immediate: true });

  if (statsLoading || statusLoading) {
    return <LoadingScreen fullscreen={false} message="Loading system stats..." />;
  }

  if (statsError || statusError) {
    return (
      <Typography color="error" sx={{ p: 3 }}>
        {statsError || statusError}
      </Typography>
    );
  }

  if (!connected) {
    return (
      <Typography color="error" sx={{ p: 3 }}>
        Host is not connected
      </Typography>
    );
  }

  if (!stats) {
    return (
      <Typography color="error" sx={{ p: 3 }}>
        No system stats available
      </Typography>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        System Statistics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="CPU Usage"
            value={stats.cpu}
            unit="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Memory Usage"
            value={stats.memory.used}
            total={stats.memory.total}
            unit="GB"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Disk Usage"
            value={stats.disk.used}
            total={stats.disk.total}
            unit="GB"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Network Traffic"
            value={(stats.network.rx + stats.network.tx) / 1024 / 1024}
            unit="MB/s"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
