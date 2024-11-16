import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Paper,
  LinearProgress,
  Tooltip,
  IconButton,
  Fade,
  useTheme,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Router as NetworkIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
} from 'recharts';
import { formatBytes } from '../utils/format';
import type { MetricsData } from '../../types/metrics';

interface MetricsDisplayProps {
  metrics: MetricsData;
  history?: MetricsData[];
  className?: string;
  onRefresh?: () => void;
}

export function MetricsDisplay({ 
  metrics, 
  history = [], 
  className = '',
  onRefresh,
}: MetricsDisplayProps) {
  const theme = useTheme();
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'storage' | 'network'>('cpu');

  const handleMetricChange = (_: React.MouseEvent<HTMLElement>, newMetric: 'cpu' | 'memory' | 'storage' | 'network') => {
    if (newMetric !== null) {
      setSelectedMetric(newMetric);
    }
  };

  const getChartColors = () => ({
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  });

  const renderCPUChart = () => {
    const colors = getChartColors();
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            stroke={theme.palette.text.secondary}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            stroke={theme.palette.text.secondary}
          />
          <ChartTooltip
            labelFormatter={(time) => new Date(time).toLocaleString()}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Usage']}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cpu.total"
            name="Total CPU"
            stroke={colors.primary}
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="cpu.user"
            name="User"
            stroke={colors.secondary}
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="cpu.system"
            name="System"
            stroke={colors.warning}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderMemoryChart = () => {
    const colors = getChartColors();
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            stroke={theme.palette.text.secondary}
          />
          <YAxis
            tickFormatter={formatBytes}
            stroke={theme.palette.text.secondary}
          />
          <ChartTooltip
            labelFormatter={(time) => new Date(time).toLocaleString()}
            formatter={(value: number) => [formatBytes(value), 'Memory']}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="memory.used"
            stackId="1"
            name="Used"
            fill={colors.error}
            stroke={colors.error}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="memory.cached"
            stackId="1"
            name="Cached"
            fill={colors.warning}
            stroke={colors.warning}
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="memory.free"
            stackId="1"
            name="Free"
            fill={colors.success}
            stroke={colors.success}
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderStorageChart = () => {
    const colors = getChartColors();
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            stroke={theme.palette.text.secondary}
          />
          <YAxis
            tickFormatter={formatBytes}
            stroke={theme.palette.text.secondary}
          />
          <ChartTooltip
            labelFormatter={(time) => new Date(time).toLocaleString()}
            formatter={(value: number) => [formatBytes(value), 'I/O']}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="storage.ioStats.readBytes"
            name="Read"
            stroke={colors.primary}
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="storage.ioStats.writeBytes"
            name="Write"
            stroke={colors.secondary}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderNetworkChart = () => {
    const colors = getChartColors();
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            stroke={theme.palette.text.secondary}
          />
          <YAxis
            tickFormatter={formatBytes}
            stroke={theme.palette.text.secondary}
          />
          <ChartTooltip
            labelFormatter={(time) => new Date(time).toLocaleString()}
            formatter={(value: number) => [formatBytes(value), 'Network']}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="network.bytesSent"
            name="Sent"
            stroke={colors.primary}
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="network.bytesRecv"
            name="Received"
            stroke={colors.secondary}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderMetricCards = () => {
    const getMetricValue = (type: 'cpu' | 'memory' | 'storage' | 'network') => {
      switch (type) {
        case 'cpu':
          return `${metrics.cpu.total.toFixed(1)}%`;
        case 'memory':
          return formatBytes(metrics.memory.used);
        case 'storage':
          return `${(metrics.storage.usage * 100).toFixed(1)}%`;
        case 'network':
          return `${formatBytes(metrics.network.bytesSent + metrics.network.bytesRecv)}/s`;
      }
    };

    const cards = [
      { type: 'cpu', icon: <TimelineIcon />, label: 'CPU Usage' },
      { type: 'memory', icon: <MemoryIcon />, label: 'Memory Usage' },
      { type: 'storage', icon: <StorageIcon />, label: 'Storage Usage' },
      { type: 'network', icon: <NetworkIcon />, label: 'Network I/O' },
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.type}>
            <Card
              raised={selectedMetric === card.type}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => setSelectedMetric(card.type as typeof selectedMetric)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {React.cloneElement(card.icon as React.ReactElement, {
                    sx: { mr: 1, color: 'primary.main' },
                  })}
                  <Typography variant="h6" component="div">
                    {card.label}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div">
                  {getMetricValue(card.type as typeof selectedMetric)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box className={className}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" gutterBottom>
          System Metrics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh metrics">
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Metrics are updated every 5 seconds">
            <IconButton size="small">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Fade in>
        <Box>
          {renderMetricCards()}

          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={selectedMetric}
                exclusive
                onChange={handleMetricChange}
                aria-label="metrics view"
                size="small"
              >
                <ToggleButton value="cpu" aria-label="cpu metrics">
                  <TimelineIcon sx={{ mr: 1 }} />
                  CPU
                </ToggleButton>
                <ToggleButton value="memory" aria-label="memory metrics">
                  <MemoryIcon sx={{ mr: 1 }} />
                  Memory
                </ToggleButton>
                <ToggleButton value="storage" aria-label="storage metrics">
                  <StorageIcon sx={{ mr: 1 }} />
                  Storage
                </ToggleButton>
                <ToggleButton value="network" aria-label="network metrics">
                  <NetworkIcon sx={{ mr: 1 }} />
                  Network
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {selectedMetric === 'cpu' && renderCPUChart()}
            {selectedMetric === 'memory' && renderMemoryChart()}
            {selectedMetric === 'storage' && renderStorageChart()}
            {selectedMetric === 'network' && renderNetworkChart()}
          </Paper>
        </Box>
      </Fade>
    </Box>
  );
}
