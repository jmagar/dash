import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  styled
} from '@mui/material';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { UserSettings } from './settings/UserSettings';
import { AdminSettings } from './settings/AdminSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const StyledContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '1200px',
  margin: '0 auto',
  fontFamily: 'Noto Sans, sans-serif',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
}));

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const { user } = useAuth();
  const { userSettings, adminSettings, loading, error } = useSettings(user?.role === 'admin');
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (loading) {
    return (
      <StyledContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </StyledContainer>
    );
  }

  if (error) {
    return (
      <StyledContainer>
        <Alert severity="error">
          Failed to load settings: {error.message}
        </Alert>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontFamily: 'Noto Sans, sans-serif' }}>
        Settings
      </Typography>

      <StyledPaper elevation={2}>
        <StyledTabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="settings tabs"
        >
          <Tab label="User Settings" {...a11yProps(0)} />
          {user?.role === 'admin' && (
            <Tab label="Admin Settings" {...a11yProps(1)} />
          )}
        </StyledTabs>

        <TabPanel value={selectedTab} index={0}>
          <UserSettings settings={userSettings} />
        </TabPanel>
        
        {user?.role === 'admin' && (
          <TabPanel value={selectedTab} index={1}>
            <AdminSettings settings={adminSettings} />
          </TabPanel>
        )}
      </StyledPaper>
    </StyledContainer>
  );
}
