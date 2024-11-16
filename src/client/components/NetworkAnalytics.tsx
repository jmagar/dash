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
      sent: metrics.network.bytesSent,
      received: metrics.network.bytesRecv,
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
                    Total: {metrics.network.connections}
                  </Typography>
                  <Typography variant="body1">
                    TCP: {metrics.network.tcpConns}
                  </Typography>
                  <Typography variant="body1">
                    UDP: {metrics.network.udpConns}
                  </Typography>
                  <Typography variant="body1">
                    Listening Ports: {metrics.network.listenPorts}
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
                    Errors (In/Out): {metrics.network.errorsIn}/{metrics.network.errorsOut}
                  </Typography>
                  <Typography variant="body1">
                    Drops (In/Out): {metrics.network.dropsIn}/{metrics.network.dropsOut}
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
                    {formatBytes(metrics.network.bytesSent)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(metrics.network.bytesRecv)}
                  </TableCell>
                  <TableCell align="right">
                    {formatBytes(metrics.network.bytesSent + metrics.network.bytesRecv)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Packets</TableCell>
                  <TableCell align="right">
                    {metrics.network.packetsSent.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {metrics.network.packetsRecv.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    {(metrics.network.packetsSent + metrics.network.packetsRecv).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Speed</TableCell>
                  <TableCell align="right" colSpan={2}>
                    Average: {formatBytes(metrics.network.averageSpeed)}/s
                  </TableCell>
                  <TableCell align="right">
                    Peak: {formatBytes(metrics.network.totalSpeed)}/s
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
