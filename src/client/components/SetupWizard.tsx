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
import React, { useState, useCallback, useEffect, type ChangeEvent } from 'react';

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
  ip?: string;
  username?: string;
}

type HostStatus = 'connected' | 'disconnected' | 'error';

interface HostData {
  name: string;
  hostname: string;
  port: number;
  ip: string;
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

  if (!data.ip?.trim()) {
    errors.ip = 'IP address is required';
  } else {
    // Basic IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(data.ip)) {
      errors.ip = 'Invalid IP address format';
    }
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
  ip: '',
  username: '',
  password: '',
  status: 'disconnected',
};

const SetupWizard: React.FC<SetupWizardProps> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { setSelectedHost } = useHost();

  const [hostData, setHostData] = useState<HostData>(initialHostData);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setHostData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value,
    }));
    // Clear messages and validation errors for the changed field
    setError(null);
    setSuccess(null);
    setValidationErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const resetForm = useCallback((): void => {
    setHostData(initialHostData);
    setError(null);
    setSuccess(null);
    setLoading(false);
    setTestingConnection(false);
    setValidationErrors({});
  }, []);

  const handleClose = useCallback((): void => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Cleanup when drawer closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const validateAndProceed = (): boolean => {
    const errors = validateForm(hostData);
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (): Promise<void> => {
    if (!validateAndProceed()) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await addHost(hostData);
      if (result.success && result.data) {
        logger.info('Host created successfully:', { hostname: hostData.hostname });
        setSuccess('Host created successfully');
        setSelectedHost(result.data);

        // Close drawer after showing success message briefly
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        throw new Error(result.error || 'Failed to create host');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'An error occurred while creating the host';
      logger.error('Setup error:', { error: err, hostData });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (): Promise<void> => {
    if (!validateAndProceed()) {
      return;
    }

    setError(null);
    setSuccess(null);
    setTestingConnection(true);

    try {
      const result = await testConnection(hostData);
      if (result.success) {
        logger.info('Connection test successful:', { hostname: hostData.hostname });
        setSuccess('Connection test successful!');
        setHostData(prev => ({ ...prev, status: 'connected' }));
      } else {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'Connection test failed';
      logger.error('Connection test error:', { error: err, hostData });
      setError(errorMessage);
      setHostData(prev => ({ ...prev, status: 'error' }));
    } finally {
      setTestingConnection(false);
    }
  };

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

        <Box component="form" noValidate>
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
            label="DNS Hostname"
            name="hostname"
            value={hostData.hostname}
            onChange={handleInputChange}
            margin="normal"
            required
            error={!!validationErrors.hostname}
            helperText={validationErrors.hostname || 'e.g., server.example.com or localhost'}
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
            label="IP Address"
            name="ip"
            value={hostData.ip}
            onChange={handleInputChange}
            margin="normal"
            required
            error={!!validationErrors.ip}
            helperText={validationErrors.ip || 'Direct IP address e.g., 192.168.1.100'}
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
              onClick={handleTestConnection}
              disabled={loading || testingConnection}
              startIcon={testingConnection ? <CircularProgress size={20} /> : null}
              fullWidth
            >
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading || testingConnection}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              fullWidth
            >
              {loading ? 'Saving...' : 'Save Host'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SetupWizard;
