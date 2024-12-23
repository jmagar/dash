import React, { useEffect } from 'react';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';


import { useHostMetrics } from '../hooks/useHostMetrics';
import { formatBytes } from '../utils/formatters';

interface NetworkAnalyticsProps {
  hostId: string;
}

export const NetworkAnalytics: React.FC<NetworkAnalyticsProps> = ({ hostId }) => {
  const { metrics, loading, error } = useHostMetrics(hostId);

  useEffect(() => {
    // ... (rest of the code remains the same)
  }, []);

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

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <TableContainer component={Card}>
            <Typography variant="h6" gutterBottom sx={{ p: 2 }}>
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
          </TableContainer>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Connections
                  </Typography>
                  <Box>
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
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network Health
                  </Typography>
                  <Box>
                    <Typography variant="body1">
                      Errors (In/Out): {metrics.network.rx_errors}/{metrics.network.tx_errors}
                    </Typography>
                    <Typography variant="body1">
                      Drops (In/Out): {metrics.network.rx_dropped}/{metrics.network.tx_dropped}
                    </Typography>
                    <Typography variant="body1">
                      Interfaces: {metrics.network.interfaces.length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Card}>
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
                    {formatBytes(metrics.network.average_speed)}/s
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(metrics.network.total_speed)}/s
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
