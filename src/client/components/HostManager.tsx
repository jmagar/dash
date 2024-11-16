import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatBytes, formatPercent, formatNumber } from '../utils/formatters';
import { SystemMetrics } from '../../types/process-metrics';
import { useSocket } from '../hooks/useSocket';

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
}> = ({ title, value, subtitle, progress }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4">
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="textSecondary">
          {subtitle}
        </Typography>
      )}
      {progress !== undefined && (
        <Box mt={2}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
    </CardContent>
  </Card>
);

const HostManager: React.FC = () => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('metrics', (newMetrics: SystemMetrics) => {
      setMetrics(prev => [...prev.slice(-30), newMetrics]);
    });

    return () => {
      socket.off('metrics');
    };
  }, [socket]);

  const latestMetrics = metrics[metrics.length - 1];

  if (!latestMetrics) {
    return <Typography>Loading metrics...</Typography>;
  }

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {/* CPU Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="CPU Usage"
            value={formatPercent(latestMetrics.cpu.total)}
            subtitle={`${latestMetrics.cpu.cores} cores, ${latestMetrics.cpu.threads} threads`}
            progress={latestMetrics.cpu.total}
          />
        </Grid>

        {/* Memory Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Memory Usage"
            value={formatPercent(latestMetrics.memory.usage)}
            subtitle={`${formatBytes(latestMetrics.memory.used)} / ${formatBytes(latestMetrics.memory.total)}`}
            progress={latestMetrics.memory.usage}
          />
        </Grid>

        {/* Storage Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Storage Usage"
            value={formatPercent(latestMetrics.storage.usage)}
            subtitle={`${formatBytes(latestMetrics.storage.used)} / ${formatBytes(latestMetrics.storage.total)}`}
            progress={latestMetrics.storage.usage}
          />
        </Grid>

        {/* Network Metrics */}
        <Grid item xs={12} md={6} lg={3}>
          <MetricCard
            title="Network"
            value={`${formatNumber(latestMetrics.network.connections)} connections`}
            subtitle={`${latestMetrics.network.tcp_conns} TCP, ${latestMetrics.network.udp_conns} UDP`}
          />
        </Grid>

        {/* CPU Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPU History
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpu.total"
                    stroke={theme.palette.primary.main}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory History
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value: number) => [`${value.toFixed(1)}%`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory.usage"
                    stroke={theme.palette.secondary.main}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Network Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network Traffic
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value: number) => [formatBytes(value)]}
                  />
                  <Line
                    type="monotone"
                    name="Sent"
                    dataKey="network.bytes_sent"
                    stroke={theme.palette.success.main}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    name="Received"
                    dataKey="network.bytes_recv"
                    stroke={theme.palette.error.main}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HostManager;
