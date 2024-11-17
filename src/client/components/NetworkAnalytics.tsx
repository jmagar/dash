import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Card,
  CardContent,
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
import { useHostMetrics } from '../hooks/useHostMetrics';
import { formatBytes } from '../utils/formatters';

export const NetworkAnalytics: React.FC = () => {
  const { metrics, loading, error } = useHostMetrics();

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Typography color="error">
        Error loading network metrics: {error}
      </Typography>
    );
  }

  if (!metrics) {
    return <Typography>No network metrics available</Typography>;
  }

  const networkData = [
    {
      name: 'Current',
      sent: metrics.network.tx_bytes,
      received: metrics.network.rx_bytes,
    },
  ];

  const packetData = [
    {
      name: 'Current',
      sent: metrics.network.tx_packets,
      received: metrics.network.rx_packets,
    },
  ];

  const errorData = [
    {
      name: 'Current',
      errors_in: metrics.network.rx_errors,
      errors_out: metrics.network.tx_errors,
    },
  ];

  const dropData = [
    {
      name: 'Current',
      drops_in: metrics.network.rx_dropped,
      drops_out: metrics.network.tx_dropped,
    },
  ];

  const connectionData = [
    {
      name: 'Current',
      tcp: metrics.network.tcp_conns,
      udp: metrics.network.udp_conns,
      listening: metrics.network.listen_ports,
    },
  ];

  const speedData = [
    {
      name: 'Current',
      average: metrics.network.average_speed,
      total: metrics.network.total_speed,
    },
  ];

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Network Traffic
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={networkData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatBytes(value as number)} />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="#8884d8"
                  name="Sent"
                />
                <Line
                  type="monotone"
                  dataKey="received"
                  stroke="#82ca9d"
                  name="Received"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Connections
                  </Typography>
                  <Typography variant="body1">
                    Total: {metrics.network.tcp_conns + metrics.network.udp_conns}
                  </Typography>
                  <Typography variant="body1">
                    TCP: {metrics.network.tcp_conns}
                  </Typography>
                  <Typography variant="body1">
                    UDP: {metrics.network.udp_conns}
                  </Typography>
                  <Typography variant="body1">
                    Listening Ports: {metrics.network.listen_ports}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network Health
                  </Typography>
                  <Typography variant="body1">
                    Errors (In/Out): {metrics.network.rx_errors}/{metrics.network.tx_errors}
                  </Typography>
                  <Typography variant="body1">
                    Drops (In/Out): {metrics.network.rx_dropped}/{metrics.network.tx_dropped}
                  </Typography>
                  <Typography variant="body1">
                    Interfaces: {metrics.network.interfaces}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Sent</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Bytes</TableCell>
                  <TableCell align="right">
                    {formatBytes(metrics.network.tx_bytes)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(metrics.network.rx_bytes)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(metrics.network.tx_bytes + metrics.network.rx_bytes)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Packets</TableCell>
                  <TableCell align="right">
                    {metrics.network.tx_packets.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {metrics.network.rx_packets.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {(metrics.network.tx_packets + metrics.network.rx_packets).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Speed</TableCell>
                  <TableCell align="right" colSpan={2}>
                    Average: {formatBytes(metrics.network.average_speed)}/s
                  </TableCell>
                  <TableCell align="right">
                    Peak: {formatBytes(metrics.network.total_speed)}/s
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
};
