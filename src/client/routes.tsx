import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { HostManager } from './components/HostManager';
import { DockerManager } from './components/DockerManager';
import { FileExplorer } from './components/FileExplorer';
import { NotificationSettings } from './components/NotificationSettings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />

      <Route path="/hosts" element={
        <PrivateRoute>
          <HostManager />
        </PrivateRoute>
      } />

      <Route path="/docker" element={
        <PrivateRoute>
          <DockerManager />
        </PrivateRoute>
      } />

      <Route path="/files" element={
        <PrivateRoute>
          <FileExplorer />
        </PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute>
          <NotificationSettings userId={useAuth().user?.id || ''} />
        </PrivateRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
