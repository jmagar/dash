import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useHostMetrics } from '../hooks/useHostMetrics';
import { formatBytes } from '../utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const StorageManager: React.FC = () => {
  const { metrics, loading, error } = useHostMetrics();

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Typography color="error">
        Error loading storage metrics: {error}
      </Typography>
    );
  }

  if (!metrics) {
    return <Typography>No storage metrics available</Typography>;
  }

  const storageData = [
    {
      name: 'Used',
      value: metrics.storage.used,
    },
    {
      name: 'Free',
      value: metrics.storage.free,
    },
  ];

  const ioData = metrics.storage.ioStats ? [
    {
      name: 'Read',
      operations: metrics.storage.ioStats.readCount,
      bytes: metrics.storage.ioStats.readBytes,
    },
    {
      name: 'Write',
      operations: metrics.storage.ioStats.writeCount,
      bytes: metrics.storage.ioStats.writeBytes,
    },
  ] : [];

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Storage Usage
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={storageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatBytes(value)}`}
                >
                  {storageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatBytes(value as number)} />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body1">
                Total: {formatBytes(metrics.storage.total)}
              </Typography>
              <Typography variant="body1">
                Usage: {(metrics.storage.usage * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Storage Summary
                  </Typography>
                  <Typography variant="body1">
                    Total Space: {formatBytes(metrics.storage.total)}
                  </Typography>
                  <Typography variant="body1">
                    Used Space: {formatBytes(metrics.storage.used)}
                  </Typography>
                  <Typography variant="body1">
                    Free Space: {formatBytes(metrics.storage.free)}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Storage Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={metrics.storage.usage * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {metrics.storage.ioStats && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      I/O Statistics
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Operation</TableCell>
                            <TableCell align="right">Count</TableCell>
                            <TableCell align="right">Data</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ioData.map((row) => (
                            <TableRow key={row.name}>
                              <TableCell>{row.name}</TableCell>
                              <TableCell align="right">
                                {row.operations.toLocaleString()}
                              </TableCell>
                              <TableCell align="right">
                                {formatBytes(row.bytes)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell>Total I/O Time</TableCell>
                            <TableCell align="right" colSpan={2}>
                              {((metrics.storage.ioStats.ioTime || 0) / 1000).toFixed(2)}s
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};
