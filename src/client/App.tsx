import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

import { Navigation } from './components/Navigation';
import { AuthProvider } from './context/AuthContext';
import { CopilotProvider } from './context/CopilotContext';
import { HostProvider } from './context/HostContext';
import { AppThemeProvider } from './providers/ThemeProvider';
import { AppRoutes } from './routes';

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
                  <AppRoutes />
                </main>
              </div>
            </HostProvider>
          </AuthProvider>
        </Router>
      </AppThemeProvider>
    </CopilotProvider>
  );
}
