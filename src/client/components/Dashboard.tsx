import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';

import type { SystemStats } from '../../types';
import { getSystemStats, getHostStatus, testExistingHost } from '../api/hosts.client';
import { useHost } from '../context/HostContext';
import { useAsync, useThrottle } from '../hooks';
import LoadingScreen from './LoadingScreen';
import SetupWizard from './SetupWizard';

interface DashboardProps {
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

const WelcomeMessage: React.FC<{ onAddHost: () => void }> = ({ onAddHost }) => (
  <Box sx={{ p: 3 }}>
    <Alert severity="info" sx={{ mb: 3 }}>
      <AlertTitle>Welcome to SSH Host Manager</AlertTitle>
      <Typography variant="body1" paragraph>
        Get started by connecting to your first SSH host. You can:
      </Typography>
      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>Add a new host using SSH credentials</li>
        <li>Monitor system resources</li>
        <li>Execute remote commands</li>
        <li>Manage files and packages</li>
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={onAddHost}
        sx={{ mt: 1 }}
      >
        Add New Host
      </Button>
    </Alert>
  </Box>
);

export default function Dashboard({ hostId }: DashboardProps): JSX.Element {
  const { selectedHost, loading: hostContextLoading, hasHosts } = useHost();
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const loadStats = useCallback(async (): Promise<SystemStats | null> => {
    if (!selectedHost?.id) return null;
    const result = await getSystemStats(selectedHost.id);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load system stats');
    }
    return result.data;
  }, [selectedHost?.id]);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (!selectedHost?.id) return false;
    const result = await getHostStatus(selectedHost.id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to check host status');
    }
    return result.data || false;
  }, [selectedHost?.id]);

  const handleRetryConnection = useCallback(async () => {
    if (!selectedHost?.id) return;
    setRetrying(true);
    try {
      const result = await testExistingHost(selectedHost.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      // Force reload stats and status
      await loadStats();
      await checkStatus();
    } catch (error) {
      console.error('Retry connection failed:', error);
    } finally {
      setRetrying(false);
    }
  }, [selectedHost?.id, loadStats, checkStatus]);

  const throttledLoadStats = useThrottle(loadStats, 5000);

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
  } = useAsync<SystemStats | null>(throttledLoadStats, { immediate: true });

  const {
    data: connected,
    loading: statusLoading,
    error: statusError,
  } = useAsync<boolean>(checkStatus, { immediate: true });

  const handleOpenSetup = (): void => {
    setSetupDialogOpen(true);
  };

  const handleCloseSetup = (): void => {
    setSetupDialogOpen(false);
  };

  useEffect(() => {
    if (hostId) {
      fetchHostData(hostId);
    }
  }, [hostId]);

  if (hostContextLoading || statsLoading || statusLoading) {
    return <LoadingScreen fullscreen={false} message="Loading system stats..." />;
  }

  // Show welcome message if no hosts exist
  if (!hasHosts) {
    return <WelcomeMessage onAddHost={handleOpenSetup} />;
  }

  // Show no host selected message
  if (!selectedHost) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>No Host Selected</AlertTitle>
            <Typography variant="body1" paragraph>
              Please select a host from the dropdown menu or add a new one.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenSetup}
              sx={{ mt: 1 }}
            >
              Add New Host
            </Button>
          </Alert>
        </Box>
        <SetupWizard open={setupDialogOpen} onClose={handleCloseSetup} />
      </>
    );
  }

  if (statsError || statusError) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        <AlertTitle>Error</AlertTitle>
        {statsError || statusError}
      </Alert>
    );
  }

  if (!connected) {
    return (
      <>
        <Box sx={{ p: 3 }}>
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleRetryConnection}
                disabled={retrying}
              >
                {retrying ? 'Retrying...' : 'Retry Connection'}
              </Button>
            }
          >
            <AlertTitle>Host Disconnected - {selectedHost.name}</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Unable to connect to the selected host. Please check:
              <Box component="ul" sx={{ mt: 1, mb: 1, pl: 2 }}>
                <li>Host is running and accessible</li>
                <li>Network connectivity</li>
                <li>SSH service is running</li>
                <li>Firewall settings</li>
              </Box>
            </Typography>
          </Alert>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenSetup}
            sx={{ mr: 2 }}
          >
            Add New Host
          </Button>
        </Box>
        <SetupWizard open={setupDialogOpen} onClose={handleCloseSetup} />
      </>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info" sx={{ m: 3 }}>
        <AlertTitle>No Data Available</AlertTitle>
        System statistics are not available for this host.
      </Alert>
    );
  }

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            System Statistics - {selectedHost.name}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenSetup}
          >
            Add New Host
          </Button>
        </Box>

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
      <SetupWizard open={setupDialogOpen} onClose={handleCloseSetup} />
    </>
  );
}
