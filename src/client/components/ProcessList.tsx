import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Typography,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Memory as MemoryIcon,
  Timer as TimerIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
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

export const ProcessList: React.FC<ProcessActions> = ({
  onTerminate,
  onRestart,
  onPause,
  onResume,
}) => {
  const { processes, loading, error } = useProcessMetrics();
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
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Typography color="error">
        Error loading process metrics: {error}
      </Typography>
    );
  }

  if (!processes) {
    return <Typography>No process metrics available</Typography>;
  }

  const filteredProcesses = processes.filter((process) =>
    process.name.toLowerCase().includes(filter.toLowerCase()) ||
    process.command?.toLowerCase().includes(filter.toLowerCase()) ||
    process.username.toLowerCase().includes(filter.toLowerCase())
  );

  const sortedProcesses = filteredProcesses.sort((a, b) => {
    const multiplier = order === 'desc' ? -1 : 1;
    switch (orderBy) {
      case 'cpuUsage':
        return multiplier * (a.cpuUsage - b.cpuUsage);
      case 'memoryUsage':
        return multiplier * (a.memoryUsage - b.memoryUsage);
      case 'memoryRss':
        return multiplier * (a.memoryRss - b.memoryRss);
      case 'threads':
        return multiplier * (a.threads - b.threads);
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const paginatedProcesses = sortedProcesses.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Filter processes..."
          value={filter}
          onChange={handleFilterChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>PID</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Process
                </TableSortLabel>
              </TableCell>
              <TableCell>User</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'cpuUsage'}
                  direction={orderBy === 'cpuUsage' ? order : 'asc'}
                  onClick={() => handleRequestSort('cpuUsage')}
                >
                  CPU %
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'memoryUsage'}
                  direction={orderBy === 'memoryUsage' ? order : 'asc'}
                  onClick={() => handleRequestSort('memoryUsage')}
                >
                  Memory %
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'memoryRss'}
                  direction={orderBy === 'memoryRss' ? order : 'asc'}
                  onClick={() => handleRequestSort('memoryRss')}
                >
                  RSS
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'threads'}
                  direction={orderBy === 'threads' ? order : 'asc'}
                  onClick={() => handleRequestSort('threads')}
                >
                  Threads
                </TableSortLabel>
              </TableCell>
              <TableCell>I/O</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProcesses.map((process) => (
              <TableRow key={process.pid}>
                <TableCell>{process.pid}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {process.name}
                    {process.command && (
                      <Chip
                        size="small"
                        label={process.command}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>{process.username}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimerIcon fontSize="small" color="action" />
                    {process.cpuUsage.toFixed(1)}%
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MemoryIcon fontSize="small" color="action" />
                    {process.memoryUsage.toFixed(1)}%
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {formatBytes(process.memoryRss)}
                </TableCell>
                <TableCell align="right">{process.threads}</TableCell>
                <TableCell>
                  {process.ioStats && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StorageIcon fontSize="small" color="action" />
                      <Typography variant="body2" component="span">
                        R: {formatBytes(process.ioStats.readBytes)}
                      </Typography>
                      <Typography variant="body2" component="span">
                        W: {formatBytes(process.ioStats.writeBytes)}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, process.pid)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredProcesses.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
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
