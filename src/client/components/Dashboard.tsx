import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  IconButton,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Router as RouterIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

import { MetricsDisplay } from './MetricsDisplay';
import { ProcessList } from './ProcessList';
import { NetworkAnalytics } from './NetworkAnalytics';
import { StorageManager } from './StorageManager';
import { SystemHealth } from './SystemHealth';
import { useHostMetrics } from '../hooks/useHostMetrics';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = React.useState(0);
  const { metrics, loading, error, refresh } = useHostMetrics();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #90caf9 30%, #64b5f6 90%)'
              : 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          System Dashboard
        </Typography>
        <IconButton
          onClick={refresh}
          disabled={loading}
          sx={{
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
        <IconButton
          sx={{
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          mb: 3,
          bgcolor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.8)
            : theme.palette.background.paper,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '0.875rem',
              fontWeight: 500,
              textTransform: 'none',
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            },
          }}
        >
          <Tab
            icon={<TimelineIcon />}
            label="Overview"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
          <Tab
            icon={<MemoryIcon />}
            label="Processes"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
          <Tab
            icon={<RouterIcon />}
            label="Network"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
          <Tab
            icon={<StorageIcon />}
            label="Storage"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
          <Tab
            icon={<SecurityIcon />}
            label="Security"
            sx={{
              '& .MuiTab-iconWrapper': {
                marginBottom: 0.5,
              },
            }}
          />
        </Tabs>
      </Paper>

      <Box
        sx={{
          mt: 2,
          '& > div': {
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.8)
              : theme.palette.background.paper,
            backdropFilter: 'blur(8px)',
          },
        }}
      >
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" sx={{ p: 3 }}>
              Error loading metrics: {error}
            </Typography>
          ) : metrics ? (
            <MetricsDisplay metrics={metrics} />
          ) : null}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ProcessList />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <NetworkAnalytics />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <StorageManager />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <SystemHealth />
        </TabPanel>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            {/* Add quick action buttons here */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
