import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import DockerManager from './components/DockerManager';
import FileExplorer from './components/FileExplorer';
import Layout from './components/Layout';
import Login from './components/Login';
import PackageManager from './components/PackageManager';
import PrivateRoute from './components/PrivateRoute';
import UserProfile from './components/UserProfile';
import WelcomeCard from './components/WelcomeCard';
import { HostProvider, useHost } from './context/HostContext';
import { ThemeProvider } from './context/ThemeContext';
import { logger } from './utils/frontendLogger';

function AppContent(): JSX.Element {
  const { selectedHost, loading, error } = useHost();

  // Log state changes
  useEffect(() => {
    logger.debug('App state updated', {
      hasSelectedHost: !!selectedHost,
      isLoading: loading,
      hasError: !!error,
      currentPath: window.location.pathname,
    });
  }, [selectedHost, loading, error]);

  // Show loading screen while checking host status
  if (loading) {
    logger.info('App is loading');
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  // Show error state if there's a context error
  if (error) {
    logger.error('App encountered an error', { error });
    return (
      <Layout>
        <div>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </Layout>
    );
  }

  // Show welcome card if no host is selected
  if (!selectedHost) {
    logger.info('No host selected, showing welcome card');
    return (
      <Layout>
        <WelcomeCard />
      </Layout>
    );
  }

  // Show main app with routes when host is selected
  logger.info('Host selected, showing main app', {
    hostId: String(selectedHost.id),
    hostname: selectedHost.hostname,
  });

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard hostId={selectedHost.id} />} />
        <Route path="/docker/*" element={<DockerManager />} />
        <Route path="/files" element={<FileExplorer />} />
        <Route path="/packages" element={<PackageManager hostId={selectedHost.id} />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function AuthenticatedApp(): JSX.Element {
  useEffect(() => {
    logger.info('Auth state', {
      isAuthDisabled: process.env.REACT_APP_DISABLE_AUTH === 'true',
    });
  }, []);

  return (
    <Routes>
      {process.env.REACT_APP_DISABLE_AUTH !== 'true' && (
        <Route path="/login" element={<Login />} />
      )}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppContent />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// Error boundary for the entire app
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    logger.error('Error boundary caught error:', {
      error: error.message,
      stack: error.stack,
    });
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('App error boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorInfo,
    });
    this.setState({
      error,
      errorInfo,
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
              <summary>Error Details</summary>
              <p>{this.state.error?.toString()}</p>
              <p>Component Stack:</p>
              <p>{this.state.errorInfo?.componentStack}</p>
            </details>
          )}
          <button
            onClick={(): void => {
              logger.info('Attempting to recover from error');
              this.setState({ hasError: false, error: null, errorInfo: null });
            }}
            style={{ marginTop: '10px' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App(): JSX.Element {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <HostProvider>
          {process.env.REACT_APP_DISABLE_AUTH === 'true' ? (
            <AppContent />
          ) : (
            <AuthenticatedApp />
          )}
        </HostProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
