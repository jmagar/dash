import React, { useState } from 'react';
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
  alpha,
  Button,
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
  ExpandMore as ExpandMoreIcon,
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

interface SystemHealthProps {
  hostId: string;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ hostId }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<string[]>([]);
  const { metrics, loading, error, refresh } = useHostMetrics(hostId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleExpand = (section: string) => {
    setExpanded(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              bgcolor: theme.palette.primary.main,
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
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
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
          <AlertTitle>No Data Available</AlertTitle>
          System health metrics are not available at this time.
        </Alert>
      </Box>
    );
  }

  const healthIndicators: HealthIndicator[] = [
    {
      name: 'CPU Usage',
      value: metrics.cpu.total,
      threshold: 80,
      unit: '%',
      status: metrics.cpu.total > 90 ? 'error' : metrics.cpu.total > 70 ? 'warning' : 'success',
      message: metrics.cpu.total > 90 ? 'Critical CPU usage' : metrics.cpu.total > 70 ? 'High CPU usage' : 'Normal',
      icon: <SpeedIcon />,
    },
    {
      name: 'Memory Usage',
      value: metrics.memory.usage,
      threshold: 85,
      unit: '%',
      status: metrics.memory.usage > 90 ? 'error' : metrics.memory.usage > 80 ? 'warning' : 'success',
      message: metrics.memory.usage > 90 ? 'Critical memory usage' : metrics.memory.usage > 80 ? 'High memory usage' : 'Normal',
      icon: <MemoryIcon />,
    },
    {
      name: 'Storage Usage',
      value: metrics.storage.usage,
      threshold: 90,
      unit: '%',
      status: metrics.storage.usage > 95 ? 'error' : metrics.storage.usage > 85 ? 'warning' : 'success',
      message: metrics.storage.usage > 95 ? 'Critical storage usage' : metrics.storage.usage > 85 ? 'Low storage space' : 'Normal',
      icon: <StorageIcon />,
    },
    {
      name: 'Network Health',
      value: metrics.network.health,
      threshold: 70,
      unit: '%',
      status: metrics.network.health < 60 ? 'error' : metrics.network.health < 80 ? 'warning' : 'success',
      message: metrics.network.health < 60 ? 'Poor network health' : metrics.network.health < 80 ? 'Degraded network performance' : 'Normal',
      icon: <NetworkIcon />,
    },
  ];

  const getStatusColor = (status: HealthIndicator['status']) => {
    switch (status) {
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)'
              : 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          System Health
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Refresh metrics">
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'rotate(180deg)',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {healthIndicators.map((indicator) => (
          <Grid item xs={12} md={6} lg={3} key={indicator.name}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: alpha(getStatusColor(indicator.status), 0.05),
                borderRadius: 2,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: alpha(getStatusColor(indicator.status), 0.1),
                    color: getStatusColor(indicator.status),
                  }}
                >
                  {indicator.icon}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {indicator.name}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {indicator.value.toFixed(1)}{indicator.unit}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={indicator.status}
                  sx={{
                    bgcolor: alpha(getStatusColor(indicator.status), 0.1),
                    color: getStatusColor(indicator.status),
                    fontWeight: 500,
                  }}
                />
              </Box>

              <LinearProgress
                variant="determinate"
                value={(indicator.value / indicator.threshold) * 100}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(getStatusColor(indicator.status), 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: getStatusColor(indicator.status),
                  },
                }}
              />

              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  color: getStatusColor(indicator.status),
                }}
              >
                {indicator.message}
              </Typography>
            </Paper>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.8)
                : theme.palette.background.paper,
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>Performance History</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={metrics.history}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="memory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.text.primary, 0.1)} />
                  <XAxis
                    dataKey="timestamp"
                    stroke={theme.palette.text.secondary}
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    stroke={theme.palette.text.secondary}
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke={theme.palette.primary.main}
                    fillOpacity={1}
                    fill="url(#cpu)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stroke={theme.palette.success.main}
                    fillOpacity={1}
                    fill="url(#memory)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
