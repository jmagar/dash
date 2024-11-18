import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  ViewList as ContainersIcon,
  Storage as ComposeIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  RestartAlt as RestartIcon,
  MoreVert as MoreVertIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Article as LogsIcon,
} from '@mui/icons-material';
import { DockerContainers } from './DockerContainers';
import DockerCompose from './DockerCompose';
import { LogViewer } from './LogViewer';
import { useDockerStats } from '../hooks/useDockerStats';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/client/store/storeTypes';
import { fetchContainers, selectAllContainers, selectIsLoading, selectError } from '@/client/store/slices/dockerSlice';
import { logger } from '@/client/utils/frontendLogger';
import type { DockerStats } from '@/types/docker';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`docker-tabpanel-${index}`}
      aria-labelledby={`docker-tab-${index}`}
      {...other}
      sx={{
        height: 'calc(100% - 49px)',
        overflow: 'auto',
        bgcolor: 'background.paper',
      }}
    >
      {value === index && (
        <Box sx={{ height: '100%', p: 3 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

interface DockerManagerProps {
  hostId: string;
  userId: string;
}

export function DockerManager({ hostId, userId }: DockerManagerProps) {
  const theme = useTheme();
  const dispatch: AppDispatch = useDispatch();
  const containers = useSelector(selectAllContainers);
  const loading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const { stats, refresh } = useDockerStats({ hostId });
  const [refreshing, setRefreshing] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 1000); // Minimum animation time
    void dispatch(fetchContainers(hostId));
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  useEffect(() => {
    const interval = setInterval(refresh, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Format percentages for display
  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };

  // Ensure values are within 0-100 range for LinearProgress
  const clampValue = (value: number): number => {
    return Math.min(Math.max(value, 0), 100);
  };

  // Get stats values safely
  const getStatsValue = (key: keyof DockerStats): number => {
    if (!stats) return 0;
    const value = stats[key];
    return typeof value === 'number' ? value : 0;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.8)
            : theme.palette.background.paper,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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
            Docker Management
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Refresh">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              onClick={handleMenuOpen}
              sx={{
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats Overview */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MemoryIcon color="primary" />
              <Typography variant="subtitle2" color="primary">Memory Usage</Typography>
            </Box>
            <Typography variant="h6">
              {formatPercentage(getStatsValue('memoryUsage'))}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={clampValue(getStatsValue('memoryUsage'))}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SpeedIcon color="primary" />
              <Typography variant="subtitle2" color="primary">CPU Usage</Typography>
            </Box>
            <Typography variant="h6">
              {formatPercentage(getStatsValue('cpuUsage'))}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={clampValue(getStatsValue('cpuUsage'))}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              flex: 1,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <StorageIcon color="primary" />
              <Typography variant="subtitle2" color="primary">Storage</Typography>
            </Box>
            <Typography variant="h6">
              {formatPercentage(getStatsValue('diskUsage'))}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={clampValue(getStatsValue('diskUsage'))}
              sx={{
                mt: 1,
                height: 6,
                borderRadius: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                },
              }}
            />
          </Paper>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="docker management tabs"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: theme.palette.text.secondary,
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab
            icon={
              <Badge
                badgeContent={getStatsValue('containers')}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    right: -3,
                    top: 3,
                  },
                }}
              >
                <ContainersIcon />
              </Badge>
            }
            label="Containers"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
          <Tab
            icon={<ComposeIcon />}
            label="Compose"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
          <Tab
            icon={<LogsIcon />}
            label="Logs"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
        </Tabs>
      </Paper>

      {/* Content */}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.8)
            : theme.palette.background.paper,
          backdropFilter: 'blur(8px)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <TabPanel value={activeTab} index={0}>
          <DockerContainers
            containers={containers}
            hostId={hostId}
            onRefresh={handleRefresh}
          />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <DockerCompose hostId={hostId} />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <LogViewer hostIds={[hostId]} userId={userId} />
        </TabPanel>
      </Paper>

      {/* Settings Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
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
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <RestartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Restart Docker Daemon</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <NetworkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Network Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Advanced Settings</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
