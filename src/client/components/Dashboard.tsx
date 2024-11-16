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
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          System Dashboard
        </Typography>
        <IconButton onClick={refresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
        <IconButton>
          <SettingsIcon />
        </IconButton>
      </Box>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<TimelineIcon />} label="Overview" />
          <Tab icon={<MemoryIcon />} label="Processes" />
          <Tab icon={<RouterIcon />} label="Network" />
          <Tab icon={<StorageIcon />} label="Storage" />
          <Tab icon={<SecurityIcon />} label="Security" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        {metrics && <MetricsDisplay metrics={metrics} />}
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
