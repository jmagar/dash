import React, { Component, ErrorInfo, ReactNode } from 'react';

import type { LogMetadata } from '../../types/logger';
import { logger } from '../utils/frontendLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  component?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global error boundary component that integrates with our logging system
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const metadata: LogMetadata = {
      component: this.props.component || 'ErrorBoundary',
      error,
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    };

    logger.error('React component error:', metadata);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details>
              <summary>Error Details</summary>
              <pre>{this.state.error.message}</pre>
              <pre>{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
