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
import UserProfile from './components/UserProfile';
import { HostProvider, useHost } from './context/HostContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppRoutes(): JSX.Element {
  const { isDarkMode, toggleTheme } = useTheme();
  const { selectedHost } = useHost();
  const hostId = selectedHost?.id;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout toggleTheme={toggleTheme} isDarkMode={isDarkMode}>
              <Routes>
                {hostId ? (
                  <>
                    <Route index element={<Dashboard hostId={hostId} />} />
                    <Route path="docker/*" element={<DockerManager />} />
                    <Route path="files" element={<FileExplorer hostId={hostId} />} />
                    <Route path="packages" element={<PackageManager hostId={hostId} />} />
                    <Route path="profile" element={<UserProfile />} />
                  </>
                ) : (
                  <Route
                    path="*"
                    element={
                      <Box sx={{ p: 3 }}>
                        <Typography color="error">
                          Please select a host to continue
                        </Typography>
                      </Box>
                    }
                  />
                )}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
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
        <AppRoutes />
      </HostProvider>
    </ThemeProvider>
  );
}
