import {
  Box,
  Button,
  Container,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import React, { useState } from 'react';

import { useHost } from '../context/HostContext';
import { logger } from '../utils/frontendLogger';

const steps = ['Add Host', 'Test Connection'];

export default function SetupWizard(): JSX.Element {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedHost } = useHost();

  const [hostData, setHostData] = useState({
    name: '',
    hostname: '',
    port: 22,
    ip: '',
    username: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setHostData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value,
    }));
  };

  const handleNext = async (): Promise<void> => {
    setError(null);
    setLoading(true);

    try {
      if (activeStep === 0) {
        // Create host
        const response = await axios.post('/api/hosts', hostData);
        if (response.data.success) {
          setSelectedHost(response.data.data);
          setActiveStep(1);
        } else {
          throw new Error(response.data.error || 'Failed to create host');
        }
      } else if (activeStep === 1) {
        // When auth is disabled, skip connection test and just reload
        if (process.env.REACT_APP_DISABLE_AUTH === 'true') {
          window.location.reload();
          return;
        }

        // Test connection
        const response = await axios.post(`/api/hosts/${hostData.name}/test`);
        if (response.data.success) {
          // Connection successful, refresh the page to show the main app
          window.location.reload();
        } else {
          throw new Error(response.data.error || 'Connection test failed');
        }
      }
    } catch (err) {
      logger.error('Setup error:', { error: err });
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = (): void => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };

  const isNextDisabled = (): boolean => {
    if (activeStep === 0) {
      return !hostData.name || !hostData.hostname || !hostData.ip || !hostData.username;
    }
    return false;
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Welcome to SSH Host Manager
        </Typography>
        <Typography variant="subtitle1" gutterBottom align="center">
          Let&apos;s set up your first host
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mt: 4, mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4 }}>
          {activeStep === 0 ? (
            <Box component="form" noValidate>
              <TextField
                fullWidth
                label="Host Name"
                name="name"
                value={hostData.name}
                onChange={handleInputChange}
                margin="normal"
                required
                helperText="A friendly name for this host"
              />
              <TextField
                fullWidth
                label="Hostname"
                name="hostname"
                value={hostData.hostname}
                onChange={handleInputChange}
                margin="normal"
                required
                helperText="e.g., localhost or remote-server.com"
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
              />
              <TextField
                fullWidth
                label="IP Address"
                name="ip"
                value={hostData.ip}
                onChange={handleInputChange}
                margin="normal"
                required
                helperText="e.g., 127.0.0.1 or server IP"
              />
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={hostData.username}
                onChange={handleInputChange}
                margin="normal"
                required
                helperText="SSH username"
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
              />
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>
                {process.env.REACT_APP_DISABLE_AUTH === 'true'
                  ? "Setup is complete! Click Next to continue."
                  : "Let's test the connection to your host."}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {process.env.REACT_APP_DISABLE_AUTH === 'true'
                  ? "The application will reload to apply changes."
                  : "Click Next to verify the connection."}
              </Typography>
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isNextDisabled() || loading}
            >
              {loading ? 'Processing...' : activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
