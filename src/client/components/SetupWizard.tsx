import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  Tooltip,
  Fade,
  Collapse,
  Zoom,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Security as SecurityIcon,
  CloudUpload as CloudUploadIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Help as HelpIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { api } from '../utils/api';
import { logger } from '../utils/logger';

interface SetupForm {
  friendlyName: string;
  hostname: string;
  port: number;
}

interface SetupStatus {
  step: number;
  message: string;
  progress: number;
  error?: string;
}

const initialForm: SetupForm = {
  friendlyName: '',
  hostname: '',
  port: 22,
};

const steps = [
  {
    label: 'Connection Details',
    description: 'Enter host connection details',
    icon: <ComputerIcon />,
    help: 'Enter the hostname or IP address of the remote host, and the port number for the agent connection.',
  },
  {
    label: 'Test Connection',
    description: 'Verify agent connectivity',
    icon: <SecurityIcon />,
    help: 'We\'ll test the connection to ensure the agent is reachable at the specified address.',
  },
  {
    label: 'Install Agent',
    description: 'Install and configure the monitoring agent',
    icon: <CloudUploadIcon />,
    help: 'The agent will be installed on the remote host to enable monitoring and management capabilities.',
  },
];

export function SetupWizard() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SetupForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showHelp, setShowHelp] = useState<number | null>(null);
  const [status, setStatus] = useState<SetupStatus>({
    step: 0,
    message: 'Ready to begin setup',
    progress: 0,
  });

  const handleChange = (field: keyof SetupForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'port' ? parseInt(event.target.value) || 22 : event.target.value
    }));
  };

  const updateStatus = (message: string, progress: number, error?: string) => {
    setStatus(prev => ({
      ...prev,
      message,
      progress,
      error,
    }));
  };

  const handleTest = async () => {
    setError(null);
    setTesting(true);
    setActiveStep(1);
    updateStatus('Testing agent connection...', 25);

    try {
      const response = await api.post('/api/hosts/test', {
        hostname: form.hostname,
        port: form.port,
      });

      if (response.ok) {
        setSuccess('Agent connection test successful!');
        setTestPassed(true);
        updateStatus('Connection test successful', 50);
        setActiveStep(2);
      } else {
        const data = await response.json();
        setError(data.message || 'Connection test failed');
        setTestPassed(false);
        updateStatus('Connection test failed', 25, data.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Connection test failed: ' + message);
      setTestPassed(false);
      updateStatus('Connection test failed', 25, message);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPassed) {
      setError('Please test the connection first');
      return;
    }

    setError(null);
    setInstalling(true);
    setActiveStep(3);
    updateStatus('Creating host record...', 60);

    try {
      // 1. Create host record
      const createResponse = await api.post('/api/hosts', form);
      if (!createResponse.ok) throw new Error('Failed to create host');
      const host = await createResponse.json();
      updateStatus('Installing agent...', 75);

      // 2. Install agent
      const installResponse = await api.post(`/api/hosts/${host.id}/install`, {
        type: 'docker',
        config: {
          logLevel: 'info',
          useSyslog: true,
          metrics: {
            collectionInterval: 5000,
            retentionPeriod: 168,
            includeIO: true,
            includeNetwork: true,
            includeExtended: true,
          },
        },
      });

      if (!installResponse.ok) throw new Error('Failed to install agent');
      updateStatus('Configuring metrics collection...', 90);

      setSuccess('Host added and agent installed successfully!');
      updateStatus('Setup complete!', 100);
      setTimeout(() => {
        navigate(`/hosts/${host.id}`);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError('Installation failed: ' + message);
      updateStatus('Installation failed', status.progress, message);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              Add New Host
            </Typography>
            <Tooltip title="Setup Help">
              <IconButton onClick={() => setShowHelp(showHelp === null ? activeStep : null)}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <AlertTitle>Success</AlertTitle>
              {success}
            </Alert>
          )}

          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                        {index < activeStep ? (
                          <CheckIcon color="success" />
                        ) : index === activeStep ? (
                          step.icon
                        ) : (
                          <Box sx={{ opacity: 0.5 }}>{step.icon}</Box>
                        )}
                      </Zoom>
                    </Box>
                  )}
                >
                  <Typography variant="subtitle1">{step.label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="textSecondary">
                    {step.description}
                  </Typography>
                  <Collapse in={showHelp === index}>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <AlertTitle>Help</AlertTitle>
                      {step.help}
                    </Alert>
                  </Collapse>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Friendly Name"
              value={form.friendlyName}
              onChange={handleChange('friendlyName')}
              margin="normal"
              required
              helperText="A memorable name for this host"
              disabled={installing}
            />

            <TextField
              fullWidth
              label="Hostname"
              value={form.hostname}
              onChange={handleChange('hostname')}
              margin="normal"
              required
              helperText="Hostname or IP address"
              disabled={installing}
            />

            <TextField
              fullWidth
              type="number"
              label="Agent Port"
              value={form.port}
              onChange={handleChange('port')}
              margin="normal"
              required
              helperText="Agent port (default: 22)"
              disabled={installing}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => void handleTest()}
                disabled={testing || installing || !form.hostname || !form.port}
                startIcon={testing ? <CircularProgress size={20} /> : <SecurityIcon />}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>

              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={installing || !testPassed}
                startIcon={installing ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              >
                {installing ? 'Installing...' : 'Install Agent'}
              </Button>
            </Box>
          </form>

          {(testing || installing) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {status.message}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={status.progress}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
