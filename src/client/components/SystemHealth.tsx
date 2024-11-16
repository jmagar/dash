import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  useTheme,
  Tooltip,
  IconButton,
  Fade,
  Collapse,
  Divider,
  Chip,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Router as NetworkIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useHostMetrics } from '../hooks/useHostMetrics';
import { formatBytes, formatUptime } from '../utils/formatters';

interface HealthIndicator {
  name: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  icon: React.ReactNode;
}

export const SystemHealth: React.FC = () => {
  const theme = useTheme();
  const { metrics, loading, error, refresh } = useHostMetrics();

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
            },
          }}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          variant="filled"
          sx={{
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: 28,
            },
          }}
        >
          <AlertTitle>Error Loading System Health</AlertTitle>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box p={3}>
        <Alert
          severity="info"
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          No system health metrics available
        </Alert>
      </Box>
    );
  }

  const getHealthStatus = (value: number, warning: number, critical: number): 'success' | 'warning' | 'error' => {
    if (value >= critical) return 'error';
    if (value >= warning) return 'warning';
    return 'success';
  };

  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'success':
        return <CheckCircleIcon color="success" />;
    }
  };

  const healthIndicators: HealthIndicator[] = [
    {
      name: 'CPU Usage',
      value: metrics.cpu.total,
      threshold: 80,
      unit: '%',
      status: getHealthStatus(metrics.cpu.total, 80, 90),
      message: `CPU usage is at ${metrics.cpu.total.toFixed(1)}%`,
      icon: <MemoryIcon />,
    },
    {
      name: 'Memory Usage',
      value: (metrics.memory.used / metrics.memory.total) * 100,
      threshold: 80,
      unit: '%',
      status: getHealthStatus((metrics.memory.used / metrics.memory.total) * 100, 80, 90),
      message: `Memory usage is at ${((metrics.memory.used / metrics.memory.total) * 100).toFixed(1)}%`,
      icon: <StorageIcon />,
    },
    {
      name: 'Storage Usage',
      value: metrics.storage.usage * 100,
      threshold: 80,
      unit: '%',
      status: getHealthStatus(metrics.storage.usage * 100, 80, 90),
      message: `Storage usage is at ${(metrics.storage.usage * 100).toFixed(1)}%`,
      icon: <StorageIcon />,
    },
    {
      name: 'Load Average',
      value: metrics.loadAverage[0],
      threshold: metrics.cpu.cores,
      unit: '',
      status: getHealthStatus(metrics.loadAverage[0], metrics.cpu.cores, metrics.cpu.cores * 2),
      message: `Load average is ${metrics.loadAverage[0].toFixed(2)}`,
      icon: <SpeedIcon />,
    },
  ];

  const performanceData = [
    {
      name: 'Current',
      cpu: metrics.cpu.total,
      memory: (metrics.memory.used / metrics.memory.total) * 100,
      storage: metrics.storage.usage * 100,
    },
  ];

  const getChipColor = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'success':
        return theme.palette.success.main;
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
          <TimelineIcon color="primary" />
          <Typography variant="h5">System Health Overview</Typography>
        </Box>
        <Tooltip title="Refresh metrics">
          <IconButton
            onClick={refresh}
            sx={{
              transition: 'transform 0.3s ease-in-out',
              '&:hover': {
                transform: 'rotate(180deg)',
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              boxShadow: theme.shadows[3],
              background: `linear-gradient(45deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              color: 'white',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Performance Overview
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffc658" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                <YAxis stroke="rgba(255,255,255,0.7)" />
                <ChartTooltip />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stackId="1"
                  stroke="#8884d8"
                  fill="url(#colorCpu)"
                  name="CPU Usage %"
                />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="url(#colorMemory)"
                  name="Memory Usage %"
                />
                <Area
                  type="monotone"
                  dataKey="storage"
                  stackId="3"
                  stroke="#ffc658"
                  fill="url(#colorStorage)"
                  name="Storage Usage %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {healthIndicators.map((indicator) => (
          <Grid item xs={12} md={6} lg={3} key={indicator.name}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  {React.cloneElement(indicator.icon as React.ReactElement, {
                    color: indicator.status,
                    sx: { fontSize: 28 },
                  })}
                  <Typography variant="h6" color={getChipColor(indicator.status)}>
                    {indicator.name}
                  </Typography>
                </Box>

                <Box sx={{ position: 'relative', mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(indicator.value / indicator.threshold) * 100}
                    color={indicator.status}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: -20,
                      color: getChipColor(indicator.status),
                    }}
                  >
                    {indicator.value.toFixed(1)}{indicator.unit}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Threshold: {indicator.threshold}{indicator.unit}
                  </Typography>
                  <Chip
                    label={indicator.status}
                    size="small"
                    color={indicator.status}
                    icon={getStatusIcon(indicator.status)}
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Alert
            severity={
              healthIndicators.some((i) => i.status === 'error')
                ? 'error'
                : healthIndicators.some((i) => i.status === 'warning')
                ? 'warning'
                : 'success'
            }
            variant="outlined"
            sx={{
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: 28,
              },
            }}
          >
            <AlertTitle>System Status Summary</AlertTitle>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              {healthIndicators.map((indicator) => (
                <Box
                  component="li"
                  key={indicator.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  {getStatusIcon(indicator.status)}
                  <Typography>
                    {indicator.message}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};
