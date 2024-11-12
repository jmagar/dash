import { Box, Typography } from '@mui/material';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import DockerManager from './components/DockerManager';
import FileExplorer from './components/FileExplorer';
import Layout from './components/Layout';
import Login from './components/Login';
import PackageManager from './components/PackageManager';
import PrivateRoute from './components/PrivateRoute';
import SetupWizard from './components/SetupWizard';
import UserProfile from './components/UserProfile';
import { HostProvider, useHost } from './context/HostContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent(): JSX.Element {
  const { isDarkMode, toggleTheme } = useTheme();
  const { selectedHost, hasHosts, loading } = useHost();

  // Show setup wizard if there are no hosts
  if (!hasHosts && !loading) {
    return <SetupWizard />;
  }

  // Show loading or no host message if needed
  if (!selectedHost) {
    return (
      <Layout toggleTheme={toggleTheme} isDarkMode={isDarkMode}>
        <Box sx={{ p: 3 }}>
          <Typography color="error">
            {loading ? 'Loading hosts...' : 'No host selected'}
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout toggleTheme={toggleTheme} isDarkMode={isDarkMode}>
      <Routes>
        <Route index element={<Dashboard hostId={selectedHost.id} />} />
        <Route path="docker/*" element={<DockerManager />} />
        <Route path="files" element={<FileExplorer />} />
        <Route path="packages" element={<PackageManager hostId={selectedHost.id} />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function AuthenticatedApp(): JSX.Element {
  return (
    <Routes>
      {process.env.REACT_APP_DISABLE_AUTH !== 'true' && (
        <Route path="/login" element={<Login />} />
      )}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppContent />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <ThemeProvider>
      <HostProvider>
        {process.env.REACT_APP_DISABLE_AUTH === 'true' ? (
          <AppContent />
        ) : (
          <AuthenticatedApp />
        )}
      </HostProvider>
    </ThemeProvider>
  );
}
