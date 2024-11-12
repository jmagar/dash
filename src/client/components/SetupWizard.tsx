import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState, useCallback } from 'react';

import { addHost, testConnection } from '../api/hosts.client';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/frontendLogger';

interface SetupWizardProps {
  open: boolean;
  onClose: () => void;
}

interface ValidationErrors {
  name?: string;
  hostname?: string;
  port?: string;
  username?: string;
}

type HostStatus = 'connected' | 'disconnected' | 'error';

interface HostData {
  name: string;
  hostname: string;
  port: number;
  username: string;
  password: string;
  status: HostStatus;
}

const validateForm = (data: HostData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.name?.trim()) {
    errors.name = 'Display name is required';
  }

  if (!data.hostname?.trim()) {
    errors.hostname = 'Hostname is required';
  }

  if (!data.username?.trim()) {
    errors.username = 'Username is required';
  }

  if (data.port < 1 || data.port > 65535) {
    errors.port = 'Port must be between 1 and 65535';
  }

  return errors;
};

const initialHostData: HostData = {
  name: '',
  hostname: '',
  port: 22,
  username: '',
  password: '',
  status: 'disconnected',
};

export default function SetupWizard({ open, onClose }: SetupWizardProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [connectionTested, setConnectionTested] = useState(false);
  const { setSelectedHost, refreshHosts } = useHost();

  const [hostData, setHostData] = useState<HostData>(initialHostData);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setHostData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value,
    }));
    // Clear messages and validation errors for the changed field
    setError(null);
    setSuccess(null);
    setConnectionTested(false);
    setValidationErrors(prev => ({ ...prev, [name]: undefined }));
  }, []);

  const resetForm = useCallback((): void => {
    setHostData(initialHostData);
    setError(null);
    setSuccess(null);
    setLoading(false);
    setTestingConnection(false);
    setConnectionTested(false);
    setValidationErrors({});
  }, []);

  const handleClose = useCallback((): void => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Cleanup when drawer closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const validateAndProceed = useCallback((): boolean => {
    const errors = validateForm(hostData);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [hostData]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!validateAndProceed() || !connectionTested) {
      logger.warn('Save attempted without validation or connection test', {
        hasValidationErrors: !validateAndProceed(),
        isConnectionTested: connectionTested,
      });
      return;
    }

    if (loading) {
      logger.warn('Save attempted while loading');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      logger.info('Attempting to save host', { hostname: hostData.hostname });
      const result = await addHost(hostData);

      if (result.success && result.data) {
        logger.info('Host created successfully', {
          hostId: result.data.id,
          hostname: hostData.hostname,
        });
        setSuccess('Host created successfully');

        // Update the host context
        await refreshHosts();
        setSelectedHost(result.data);

        // Show success message briefly before closing
        await new Promise(resolve => setTimeout(resolve, 1500));
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to create host');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating the host';
      logger.error('Setup error:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        hostData: { ...hostData, password: '[REDACTED]' },
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [validateAndProceed, connectionTested, loading, hostData, refreshHosts, setSelectedHost, handleClose]);

  const handleTestConnection = useCallback(async (): Promise<void> => {
    if (!validateAndProceed()) {
      logger.warn('Connection test blocked: validation failed');
      return;
    }

    if (testingConnection) {
      logger.warn('Connection test blocked: already testing');
      return;
    }

    try {
      setTestingConnection(true);
      setError(null);
      setSuccess(null);
      setConnectionTested(false);

      logger.info('Testing connection', { hostname: hostData.hostname });
      const result = await testConnection(hostData);

      if (result.success) {
        logger.info('Connection test successful', { hostname: hostData.hostname });
        setSuccess('Connection test successful!');
        setHostData(prev => ({ ...prev, status: 'connected' }));
        setConnectionTested(true);
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      logger.error('Connection test error:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        hostData: { ...hostData, password: '[REDACTED]' },
      });
      setError(errorMessage);
      setHostData(prev => ({ ...prev, status: 'error' }));
      setConnectionTested(false);
    } finally {
      setTestingConnection(false);
    }
  }, [validateAndProceed, testingConnection, hostData]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '400px',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Add New Host</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          component="form"
          noValidate
          onSubmit={(e): void => {
            e.preventDefault();
            logger.info('Form submitted');
            void handleSave();
          }}
        >
          <TextField
            fullWidth
            label="Display Name"
            name="name"
            value={hostData.name}
            onChange={handleInputChange}
            margin="normal"
            required
            error={!!validationErrors.name}
            helperText={validationErrors.name || 'A friendly name to identify this host'}
            disabled={loading || testingConnection}
          />
          <TextField
            fullWidth
            label="Hostname or IP Address"
            name="hostname"
            value={hostData.hostname}
            onChange={handleInputChange}
            margin="normal"
            required
            error={!!validationErrors.hostname}
            helperText={validationErrors.hostname || 'e.g., server.example.com or 192.168.1.100'}
            disabled={loading || testingConnection}
          />
          <TextField
            fullWidth
            label="Port"
            name="port"
            type="number"
            value={hostData.port}
            onChange={handleInputChange}
            margin="normal"
            required
            error={!!validationErrors.port}
            helperText={validationErrors.port || 'SSH port (default: 22)'}
            disabled={loading || testingConnection}
          />
          <TextField
            fullWidth
            label="Username"
            name="username"
            value={hostData.username}
            onChange={handleInputChange}
            margin="normal"
            required
            error={!!validationErrors.username}
            helperText={validationErrors.username || 'SSH username'}
            disabled={loading || testingConnection}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={hostData.password}
            onChange={handleInputChange}
            margin="normal"
            helperText="SSH password (optional if using key-based auth)"
            disabled={loading || testingConnection}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              type="button"
              onClick={(): Promise<void> => handleTestConnection()}
              disabled={loading || testingConnection}
              startIcon={testingConnection ? <CircularProgress size={20} /> : null}
              fullWidth
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            {connectionTested && (
              <Button
                variant="contained"
                type="submit"
                disabled={loading || testingConnection}
                startIcon={loading ? <CircularProgress size={20} /> : null}
                fullWidth
              >
                {loading ? 'Saving...' : 'Save Host'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
