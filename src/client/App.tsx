import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { store } from './store';
import { Navigation } from './components/Navigation';
import { AuthProvider } from './context/AuthContext';
import { CopilotProvider } from './context/CopilotContext';
import { HostProvider } from './context/HostContext';
import { AppThemeProvider } from './providers/ThemeProvider';
import { AppRoutes } from './routes';

export function App() {
  return (
    <Provider store={store}>
      <CopilotProvider>
        <AppThemeProvider>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <SnackbarProvider maxSnack={3}>
              <CssBaseline />
              <BrowserRouter>
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
              </BrowserRouter>
            </SnackbarProvider>
          </LocalizationProvider>
        </AppThemeProvider>
      </CopilotProvider>
    </Provider>
  );
}
