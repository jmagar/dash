import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './styles/theme';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FileExplorer from './components/FileExplorer';
import Terminal from './components/Terminal';
import RemoteExecution from './components/RemoteExecution';
import PackageManager from './components/PackageManager';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import { useUserContext } from './context/UserContext';
import { DEFAULT_USER_PREFERENCES } from './types';

const App: React.FC = () => {
  const { user, setUser } = useUserContext();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      // TODO: Implement token validation and user fetch
      // For now, just set a placeholder user
      setUser({
        id: 1,
        uuid: 'placeholder-uuid',
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'user',
        preferredLanguage: 'en',
        isActive: true,
        lastLogin: new Date(),
        mfaEnabled: false,
        gdprCompliant: true,
        preferences: DEFAULT_USER_PREFERENCES,
      });
    }
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
