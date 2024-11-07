import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../styles/theme';
import { UserContextProvider } from '../context/UserContext';
import Navigation from './Navigation';
import Dashboard from './Dashboard';
import FileExplorer from './FileExplorer';
import PackageManager from './PackageManager';
import Terminal from './Terminal';
import RemoteExecution from './RemoteExecution';
import UserProfile from './UserProfile';
import Login from './Login';
import PrivateRoute from './PrivateRoute';
import ErrorBoundary from './ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <UserContextProvider>
          <Router>
            <Navigation />
            <Routes>
              <Route path="/login" element={<Login />} />
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
                path="/packages"
                element={
                  <PrivateRoute>
                    <PackageManager />
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
                path="/profile"
                element={
                  <PrivateRoute>
                    <UserProfile />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </UserContextProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
