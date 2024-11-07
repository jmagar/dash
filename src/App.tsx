import { ThemeProvider, CssBaseline } from '@mui/material';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { validateToken } from './api/auth';
import Dashboard from './components/Dashboard';
import FileExplorer from './components/FileExplorer';
import Layout from './components/Layout';
import Login from './components/Login';
import PackageManager from './components/PackageManager';
import PrivateRoute from './components/PrivateRoute';
import RemoteExecution from './components/RemoteExecution';
import Terminal from './components/Terminal';
import UserProfile from './components/UserProfile';
import { useUserContext } from './context/UserContext';
import DockerPage from './pages/Docker';
import { theme } from './styles/theme';

const App: React.FC = () => {
  const { user, setUser } = useUserContext();

  useEffect(() => {
    const validateUserToken = async (): Promise<void> => {
      const token = localStorage.getItem('token');
      if (token && !user) {
        const result = await validateToken(token);
        if (result.success && result.data) {
          setUser(result.data);
        } else {
          // Token validation failed, remove the invalid token
          localStorage.removeItem('token');
        }
      }
    };

    void validateUserToken();
  }, [user, setUser]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {user ? (
          <Layout>
            <Routes>
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/files"
                element={
                  <PrivateRoute>
                    <FileExplorer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/terminal"
                element={
                  <PrivateRoute>
                    <Terminal />
                  </PrivateRoute>
                }
              />
              <Route
                path="/execute"
                element={
                  <PrivateRoute>
                    <RemoteExecution />
                  </PrivateRoute>
                }
              />
              <Route
                path="/packages"
                element={
                  <PrivateRoute>
                    <PackageManager />
                  </PrivateRoute>
                }
              />
              <Route
                path="/docker"
                element={
                  <PrivateRoute>
                    <DockerPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <UserProfile />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        )}
      </Router>
    </ThemeProvider>
  );
};

export default App;
