import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import { Dashboard } from './components/Dashboard';
import { HostManager } from './components/HostManager';
import { DockerManager } from './components/DockerManager';
import { FileExplorer } from './components/FileExplorer/index';
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

function HostManagerRoute() {
  const { hostId } = useParams<{ hostId: string }>();
  return hostId ? <HostManager hostId={hostId} /> : <Navigate to="/hosts" replace />;
}

function DockerManagerRoute() {
  const { hostId } = useParams<{ hostId: string }>();
  const { user } = useAuth();
  return hostId && user ? <DockerManager hostId={hostId} userId={user.id} /> : <Navigate to="/docker" replace />;
}

export function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />

      <Route path="/hosts/:hostId" element={
        <PrivateRoute>
          <HostManagerRoute />
        </PrivateRoute>
      } />

      <Route path="/docker/:hostId" element={
        <PrivateRoute>
          <DockerManagerRoute />
        </PrivateRoute>
      } />

      <Route path="/files" element={
        <PrivateRoute>
          <FileExplorer />
        </PrivateRoute>
      } />

      <Route path="/notifications" element={
        <PrivateRoute>
          <NotificationSettings userId={user.id} />
        </PrivateRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
