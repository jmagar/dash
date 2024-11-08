import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Theme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(3),
  marginTop: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.error.dark,
  color: theme.palette.error.contrastText,
}));

const ErrorDetails = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  maxHeight: '200px',
  overflow: 'auto',
  '& pre': {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}));

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to error reporting service
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReportError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    // Implement error reporting logic here
    console.log('Reporting error:', { error, errorInfo });
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md">
          <ErrorContainer elevation={3}>
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              We apologize for the inconvenience. The error has been logged and we'll look into it.
            </Typography>
            <Box sx={{ mt: 2, mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
                sx={{ mr: 2 }}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => void this.handleReportError()}
              >
                Report Error
              </Button>
            </Box>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <ErrorDetails elevation={1}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Error Details:
                </Typography>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <>
                    <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 2 }}>
                      Component Stack:
                    </Typography>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </>
                )}
              </ErrorDetails>
            )}
          </ErrorContainer>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
