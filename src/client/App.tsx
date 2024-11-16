import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HostProvider } from './context/HostContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './components/UserProfile';
import { SetupWizard } from './components/SetupWizard';
import { RemoteExecution } from './components/RemoteExecution';
import { NotificationSettingsWrapper } from './components/NotificationSettingsWrapper';
import { Navigation } from './components/Navigation';

export function App() {
  return (
    <Router>
      <AuthProvider>
        <HostProvider>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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
  );
}
