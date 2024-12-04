import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Alert,
  AlertTitle,
  Collapse,
  Divider,
  Zoom,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Security as SecurityIcon,
  CloudUpload as CloudUploadIcon,
  Help as HelpIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { api } from '../api/api.client';
import { frontendLogger } from '../utils/frontendLogger';
import type { ApiResponse } from '../../types/api/common';
import type { Host } from '../../types/models-shared';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

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

interface SetupStep {
  label: string;
  description: string;
  icon: React.ReactNode;
  help: string;
}

interface AgentConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  useSyslog: boolean;
  metrics: {
    collectionInterval: number;
    retentionPeriod: number;
    includeIO: boolean;
    includeNetwork: boolean;
    includeExtended: boolean;
  };
}

interface TestConnectionResponse {
  success: boolean;
  message?: string;
}

interface CreateHostResponse {
  host: Host;
}

const initialForm: SetupForm = {
  friendlyName: '',
  hostname: '',
  port: 22,
};

const steps: readonly SetupStep[] = [
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
] as const;

export function SetupWizard(): JSX.Element {
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

  const updateStatus = useCallback((message: string, progress: number, error?: string) => {
    setStatus(prev => ({
      ...prev,
      message,
      progress,
      error,
    }));
  }, []);

  const handleChange = useCallback((field: keyof SetupForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    if (field === 'port') {
      const portValue = parseInt(value, 10);
      if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
        setError('Port must be a number between 1 and 65535');
        return;
      }
      setError(null);
      setForm(prev => ({ ...prev, [field]: portValue }));
    } else {
      setForm(prev => ({ ...prev, [field]: value }));
    }
  }, []);

  const handleTest = useCallback(async (): Promise<void> => {
    setError(null);
    setSuccess(null);
    setTesting(true);
    setActiveStep(1);
    updateStatus('Testing connection...', 25);

    try {
      const response = await api.post<ApiResponse<TestConnectionResponse>>('/api/hosts/test', {
        data: form,
      });

      if (response.data.success) {
        setTestPassed(true);
        updateStatus('Connection test passed', 50);
      } else {
        setTestPassed(false);
        updateStatus('Connection test failed', 25, response.data.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      frontendLoggingManager.getInstance().();
      setError(`Connection test failed: ${message}`);
      setTestPassed(false);
      updateStatus('Connection test failed', 25, message);
    } finally {
      setTesting(false);
    }
  }, [form, updateStatus]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!testPassed) {
      setError('Please test the connection first');
      return;
    }

    if (!form.friendlyName.trim()) {
      setError('Friendly name is required');
      return;
    }

    setError(null);
    setInstalling(true);
    setActiveStep(3);
    updateStatus('Creating host...', 50);

    try {
      const createResponse = await api.post<ApiResponse<CreateHostResponse>>('/api/hosts', {
        data: form,
      });

      if (createResponse.data.success) {
        const host = createResponse.data.data.host;
        updateStatus('Installing agent...', 75);

        const config: AgentConfig = {
          logLevel: 'info',
          useSyslog: true,
          metrics: {
            collectionInterval: 5000,
            retentionPeriod: 168,
            includeIO: true,
            includeNetwork: true,
            includeExtended: true,
          },
        };

        const installResponse = await api.post<ApiResponse<void>>(`/api/hosts/${host.id}/install`, {
          type: 'docker',
          config,
        });

        if (installResponse.data.success) {
          updateStatus('Configuring metrics collection...', 90);
          setSuccess('Host added and agent installed successfully!');
          updateStatus('Setup complete!', 100);
          setTimeout(() => {
            navigate(`/hosts/${host.id}`);
          }, 2000);
        } else {
          throw new Error(installResponse.data.error || 'Failed to install agent');
        }
      } else {
        throw new Error(createResponse.data.error || 'Failed to create host');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      frontendLoggingManager.getInstance().();
      setError(`Installation failed: ${message}`);
      updateStatus('Installation failed', status.progress, message);
    } finally {
      setInstalling(false);
    }
  }, [form, testPassed, updateStatus, navigate, status.progress]);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => prev === null ? activeStep : null);
  }, [activeStep]);

  const renderStepIcon = useCallback((index: number): React.ReactElement => {
    if (index < activeStep) {
      return <CheckIcon color="success" />;
    }
    if (index === activeStep) {
      return steps[index].icon as React.ReactElement;
    }
    return <Box sx={{ opacity: 0.5 }}>{steps[index].icon}</Box>;
  }, [activeStep]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              Add New Host
            </Typography>
            <Tooltip title="Setup Help">
              <IconButton onClick={toggleHelp}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {(error || success) && (
            <Box sx={{ mb: 2 }}>
              {error && (
                <Alert severity="error">
                  <AlertTitle>Error</AlertTitle>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success">
                  <AlertTitle>Success</AlertTitle>
                  {success}
                </Alert>
              )}
            </Box>
          )}

          <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                        {renderStepIcon(index)}
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
              error={!form.friendlyName.trim() && error !== null}
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
              error={!form.hostname.trim() && error !== null}
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
              error={(!form.port || form.port < 1 || form.port > 65535) && error !== null}
              inputProps={{
                min: 1,
                max: 65535
              }}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => void handleTest()}
                disabled={testing || installing || !form.hostname.trim() || !form.port}
                startIcon={testing ? <CircularProgress size={20} /> : <SecurityIcon />}
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>

              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={installing || !testPassed || !form.friendlyName.trim()}
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

