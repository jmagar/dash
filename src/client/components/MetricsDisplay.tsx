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
import { formatBytes, formatPercentage, formatNumber } from '../utils/format';
import type { SystemMetrics } from '../../types/metrics';

interface MetricsDisplayProps {
  metrics: SystemMetrics;
  history?: SystemMetrics[];
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
  const [selectedView, setSelectedView] = useState<'realtime' | 'history'>('realtime');

  const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: 'realtime' | 'history' | null) => {
    if (newView !== null) {
      setSelectedView(newView);
    }
  };

  const cpuData = history.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    user: m.cpu.user,
    system: m.cpu.system,
    idle: m.cpu.idle,
  }));

  const memoryData = history.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    used: m.memory.used,
    free: m.memory.free,
    cached: m.memory.cached,
    buffers: m.memory.buffers,
  }));

  const networkData = history.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    rx: m.network.rx_bytes,
    tx: m.network.tx_bytes,
  }));

  const diskData = history.map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    read: m.storage.read_bytes,
    write: m.storage.write_bytes,
  }));

  return (
    <Box className={className}>
      <Box display="flex" alignItems="center" mb={2}>
        <ToggleButtonGroup
          value={selectedView}
          exclusive
          onChange={handleViewChange}
          size="small"
          sx={{ mr: 2 }}
        >
          <ToggleButton value="realtime">
            <Tooltip title="Real-time metrics">
              <TimelineIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="history">
            <Tooltip title="Historical metrics">
              <TimelineIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>

        {onRefresh && (
          <Tooltip title="Refresh metrics">
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* CPU Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <MemoryIcon sx={{ mr: 1 }} />
                <Typography variant="h6">CPU Usage</Typography>
                <Tooltip title="CPU usage across all cores">
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {selectedView === 'realtime' ? (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total: {formatPercentage(metrics.cpu.total)}
                  </Typography>
                  <Box mb={2}>
                    <LinearProgress
                      variant="determinate"
                      value={metrics.cpu.total}
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
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        User: {formatPercentage(metrics.cpu.user)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        System: {formatPercentage(metrics.cpu.system)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Idle: {formatPercentage(metrics.cpu.idle)}
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Box height={200}>
                  <ResponsiveContainer>
                    <AreaChart data={cpuData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="user"
                        stackId="1"
                        stroke={theme.palette.primary.main}
                        fill={theme.palette.primary.light}
                      />
                      <Area
                        type="monotone"
                        dataKey="system"
                        stackId="1"
                        stroke={theme.palette.secondary.main}
                        fill={theme.palette.secondary.light}
                      />
                      <Area
                        type="monotone"
                        dataKey="idle"
                        stackId="1"
                        stroke={theme.palette.grey[500]}
                        fill={theme.palette.grey[200]}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StorageIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Memory Usage</Typography>
                <Tooltip title="Physical memory usage">
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {selectedView === 'realtime' ? (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Used: {formatBytes(metrics.memory.used)} of {formatBytes(metrics.memory.total)}
                  </Typography>
                  <Box mb={2}>
                    <LinearProgress
                      variant="determinate"
                      value={(metrics.memory.used / metrics.memory.total) * 100}
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
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Free: {formatBytes(metrics.memory.free)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Cached: {formatBytes(metrics.memory.cached)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        Buffers: {formatBytes(metrics.memory.buffers)}
                      </Typography>
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Box height={200}>
                  <ResponsiveContainer>
                    <AreaChart data={memoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="used"
                        stackId="1"
                        stroke={theme.palette.error.main}
                        fill={theme.palette.error.light}
                      />
                      <Area
                        type="monotone"
                        dataKey="cached"
                        stackId="1"
                        stroke={theme.palette.warning.main}
                        fill={theme.palette.warning.light}
                      />
                      <Area
                        type="monotone"
                        dataKey="buffers"
                        stackId="1"
                        stroke={theme.palette.info.main}
                        fill={theme.palette.info.light}
                      />
                      <Area
                        type="monotone"
                        dataKey="free"
                        stackId="1"
                        stroke={theme.palette.success.main}
                        fill={theme.palette.success.light}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Network Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <NetworkIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Network Usage</Typography>
                <Tooltip title="Network traffic across all interfaces">
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {selectedView === 'realtime' ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Received: {formatBytes(metrics.network.rx_bytes)}/s
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Transmitted: {formatBytes(metrics.network.tx_bytes)}/s
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Box height={200}>
                  <ResponsiveContainer>
                    <LineChart data={networkData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="rx"
                        name="Received"
                        stroke={theme.palette.primary.main}
                      />
                      <Line
                        type="monotone"
                        dataKey="tx"
                        name="Transmitted"
                        stroke={theme.palette.secondary.main}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Disk Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StorageIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Disk Usage</Typography>
                <Tooltip title="Disk I/O across all devices">
                  <IconButton size="small" sx={{ ml: 'auto' }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {selectedView === 'realtime' ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Read: {formatBytes(metrics.storage.read_bytes)}/s
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Write: {formatBytes(metrics.storage.write_bytes)}/s
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <Box height={200}>
                  <ResponsiveContainer>
                    <LineChart data={diskData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="read"
                        name="Read"
                        stroke={theme.palette.primary.main}
                      />
                      <Line
                        type="monotone"
                        dataKey="write"
                        name="Write"
                        stroke={theme.palette.secondary.main}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
