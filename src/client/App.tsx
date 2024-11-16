import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import { HostProvider } from './context/HostContext';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './components/Login';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { SetupWizard } from './components/SetupWizard';
import { RemoteExecution } from './components/RemoteExecution';
import { NotificationSettingsWrapper } from './components/NotificationSettingsWrapper';
import { Navigation } from './components/Navigation';
import { useTheme } from './hooks/useTheme';
import { CopilotProvider } from './context/CopilotContext';

export function App() {
  const { effectiveTheme } = useTheme();

  const muiTheme = React.useMemo(() => createTheme({
    palette: {
      mode: effectiveTheme,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: "#6b6b6b #2b2b2b",
            "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
              backgroundColor: "#2b2b2b",
            },
            "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
              borderRadius: 8,
              backgroundColor: "#6b6b6b",
              minHeight: 24,
              border: "3px solid #2b2b2b",
            },
            "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
              backgroundColor: "#959595",
            },
            "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
              backgroundColor: "#959595",
            },
            "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
              backgroundColor: "#959595",
            },
            "&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner": {
              backgroundColor: "#2b2b2b",
            },
          },
        },
      },
    },
  }), [effectiveTheme]);

  return (
    <CopilotProvider>
      <ThemeProvider theme={muiTheme}>
        <Router>
          <AuthProvider>
            <HostProvider>
              <div className={`min-h-screen ${effectiveTheme === 'dark' ? 'dark' : ''}`}>
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
      </ThemeProvider>
    </CopilotProvider>
  );
}
