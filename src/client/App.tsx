import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

import { Dashboard } from './components/Dashboard';
import Login from './components/Login';
import { Navigation } from './components/Navigation';
import { NotificationSettingsWrapper } from './components/NotificationSettingsWrapper';
import { PrivateRoute } from './components/PrivateRoute';
import { RemoteExecution } from './components/RemoteExecution';
import { SetupWizard } from './components/SetupWizard';
import { UserProfile } from './components/UserProfile';
import { AuthProvider } from './context/AuthContext';
import { CopilotProvider } from './context/CopilotContext';
import { HostProvider } from './context/HostContext';
import { AppThemeProvider } from './providers/ThemeProvider';

export function App() {
  return (
    <CopilotProvider>
      <AppThemeProvider>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <HostProvider>
              <div className="min-h-screen">
                <Navigation />
                <main className="py-10">
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
                      path="/profile"
                      element={
                        <PrivateRoute>
                          <UserProfile />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/setup"
                      element={
                        <PrivateRoute>
                          <SetupWizard />
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
                      path="/settings/notifications"
                      element={
                        <PrivateRoute>
                          <NotificationSettingsWrapper />
                        </PrivateRoute>
                      }
                    />
                  </Routes>
                </main>
              </div>
            </HostProvider>
          </AuthProvider>
        </Router>
      </AppThemeProvider>
    </CopilotProvider>
  );
}
