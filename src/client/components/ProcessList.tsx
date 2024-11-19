import React, { useState } from 'react';

import {
  Memory as MemoryIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';

import { useProcessMetrics } from '../hooks/useProcessMetrics';
import { formatBytes } from '../utils/formatters';

type Order = 'asc' | 'desc';
type OrderBy = 'cpuUsage' | 'memoryUsage' | 'memoryRss' | 'threads' | 'name';

interface ProcessActions {
  onTerminate?: (pid: number) => void;
  onRestart?: (pid: number) => void;
  onPause?: (pid: number) => void;
  onResume?: (pid: number) => void;
}

interface ProcessListProps extends ProcessActions {
  hostId: string;
}

export const ProcessList: React.FC<ProcessListProps> = ({
  hostId,
  onTerminate,
  onRestart,
  onPause,
  onResume,
}) => {
  const theme = useTheme();
  const { processes, loading, error } = useProcessMetrics(hostId);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('cpuUsage');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(event.target.value);
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, pid: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedPid(pid);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPid(null);
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading process metrics: {error}
      </Alert>
    );
  }

  if (!processes) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="textSecondary">No process metrics available</Typography>
      </Box>
    );
  }

  const filteredProcesses = processes.filter((process) =>
    process.name.toLowerCase().includes(filter.toLowerCase())
  );

  const sortedProcesses = filteredProcesses.sort((a, b) => {
    const isAsc = order === 'asc';
    switch (orderBy) {
      case 'cpuUsage':
        return isAsc ? a.cpuUsage - b.cpuUsage : b.cpuUsage - a.cpuUsage;
      case 'memoryUsage':
        return isAsc ? a.memoryUsage - b.memoryUsage : b.memoryUsage - a.memoryUsage;
      case 'memoryRss':
        return isAsc ? a.memoryRss - b.memoryRss : b.memoryRss - a.memoryRss;
      case 'threads':
        return isAsc ? a.threads - b.threads : b.threads - a.threads;
      case 'name':
        return isAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  const paginatedProcesses = sortedProcesses.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Filter processes..."
          value={filter}
          onChange={handleFilterChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: {
              bgcolor: theme.palette.background.paper,
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              },
            },
          }}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          mb: 2,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.8)
            : theme.palette.background.paper,
          backdropFilter: 'blur(8px)',
        }}
      >
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow>
                <TableCell
                  sortDirection={orderBy === 'name' ? order : false}
                  sx={{ fontWeight: 600 }}
                >
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Process
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sortDirection={orderBy === 'cpuUsage' ? order : false}
                  sx={{ fontWeight: 600 }}
                >
                  <TableSortLabel
                    active={orderBy === 'cpuUsage'}
                    direction={orderBy === 'cpuUsage' ? order : 'asc'}
                    onClick={() => handleRequestSort('cpuUsage')}
                  >
                    CPU
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sortDirection={orderBy === 'memoryUsage' ? order : false}
                  sx={{ fontWeight: 600 }}
                >
                  <TableSortLabel
                    active={orderBy === 'memoryUsage'}
                    direction={orderBy === 'memoryUsage' ? order : 'asc'}
                    onClick={() => handleRequestSort('memoryUsage')}
                  >
                    Memory
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  align="right"
                  sortDirection={orderBy === 'threads' ? order : false}
                  sx={{ fontWeight: 600 }}
                >
                  <TableSortLabel
                    active={orderBy === 'threads'}
                    direction={orderBy === 'threads' ? order : 'asc'}
                    onClick={() => handleRequestSort('threads')}
                  >
                    Threads
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedProcesses.map((process) => (
                <TableRow
                  key={process.pid}
                  hover
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MemoryIcon
                        fontSize="small"
                        sx={{ color: theme.palette.primary.main }}
                      />
                      <Typography variant="body2">{process.name}</Typography>
                      <Chip
                        label={`PID ${process.pid}`}
                        size="small"
                        sx={{
                          ml: 1,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Typography variant="body2">
                        {process.cpuUsage.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={process.cpuUsage}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      <Typography variant="body2">
                        {formatBytes(process.memoryUsage)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(process.memoryUsage / process.memoryRss) * 100}
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{process.threads}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(event) => handleMenuOpen(event, process.pid)}
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': {
                          color: theme.palette.primary.main,
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedProcesses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 1.5,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {onTerminate && (
          <MenuItem
            onClick={() => {
              if (selectedPid) onTerminate(selectedPid);
              handleMenuClose();
            }}
          >
            Terminate
          </MenuItem>
        )}
        {onRestart && (
          <MenuItem
            onClick={() => {
              if (selectedPid) onRestart(selectedPid);
              handleMenuClose();
            }}
          >
            Restart
          </MenuItem>
        )}
        {onPause && (
          <MenuItem
            onClick={() => {
              if (selectedPid) onPause(selectedPid);
              handleMenuClose();
            }}
          >
            Pause
          </MenuItem>
        )}
        {onResume && (
          <MenuItem
            onClick={() => {
              if (selectedPid) onResume(selectedPid);
              handleMenuClose();
            }}
          >
            Resume
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};
