import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import FileExplorer from './components/FileExplorer';
import Layout from './components/Layout';
import Login from './components/Login';
import PackageManager from './components/PackageManager';
import PrivateRoute from './components/PrivateRoute';
import RemoteExecution from './components/RemoteExecution';
import UserProfile from './components/UserProfile';
import ComposePage from './pages/Compose';
import ContainersPage from './pages/Containers';
import DockerPage from './pages/Docker';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout>
                <Outlet />
              </Layout>
            </PrivateRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Docker management */}
          <Route path="docker" element={<DockerPage />} />
          <Route path="containers" element={<ContainersPage />} />
          <Route path="compose" element={<ComposePage />} />

          {/* System management */}
          <Route path="files" element={<FileExplorer />} />
          <Route path="packages" element={<PackageManager />} />
          <Route path="remote-execution" element={<RemoteExecution hostId={1} />} />

          {/* User */}
          <Route path="profile" element={<UserProfile />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
