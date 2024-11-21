import React, { Component, ErrorInfo } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Stack,
  Collapse,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    // You can also log the error to an error reporting service here
    logger.error('Error caught by ErrorBoundary:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      componentStack: errorInfo.componentStack
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleToggleDetails = () => {
    this.setState((state) => ({
      showDetails: !state.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={3}>
              <Alert
                severity="error"
                icon={<BugReportIcon />}
                sx={{
                  '& .MuiAlert-icon': {
                    fontSize: '2rem',
                  },
                }}
              >
                <AlertTitle sx={{ fontSize: '1.2rem' }}>
                  Oops! Something went wrong
                </AlertTitle>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Alert>

              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRefresh}
                  color="primary"
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outlined"
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        transform: this.state.showDetails ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.3s',
                      }}
                    />
                  }
                  onClick={this.handleToggleDetails}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </Stack>

              <Collapse in={this.state.showDetails}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    overflowX: 'auto',
                  }}
                >
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Error Stack:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                    }}
                  >
                    {this.state.error?.stack}
                  </Typography>
                  {this.state.errorInfo && (
                    <>
                      <Typography
                        variant="subtitle2"
                        color="error"
                        sx={{ mt: 2 }}
                        gutterBottom
                      >
                        Component Stack:
                      </Typography>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    </>
                  )}
                </Paper>
              </Collapse>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
