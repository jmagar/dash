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
import WelcomeCard from './components/WelcomeCard';
import { HostProvider, useHost } from './context/HostContext';
import { ThemeProvider } from './context/ThemeContext';

function AppContent(): JSX.Element {
  const { selectedHost, loading } = useHost();

  // Show loading or welcome card if no host is selected
  if (!selectedHost) {
    return (
      <Layout>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <WelcomeCard />
        )}
      </Layout>
    );
  }

  return (
    <Layout>
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
