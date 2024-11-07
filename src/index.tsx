import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Styles
import './styles/global.css';

// Main Application Component
import App from './App';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#d32f2f' }}>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button
            onClick={(): void => window.location.reload()}
            style={{
              padding: '10px 20px',
              margin: '20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Get the root element
const rootElement = document.getElementById('root');

// Ensure root element exists
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Create root
const root = createRoot(rootElement);

// Render the application
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
