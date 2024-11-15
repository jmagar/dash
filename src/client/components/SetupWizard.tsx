import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Alert,
  Box,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CreateHostRequest } from '../../types/models-shared';
import { createHost, testHost } from '../api/hosts.client';
import { logger } from '../utils/logger';

interface SetupWizardProps {
  open?: boolean;
  onClose?: () => void;
}

const initialForm: CreateHostRequest = {
  name: '',
  hostname: '',
  port: 22,
  username: '',
  password: '',
};

export function SetupWizard({ open, onClose }: SetupWizardProps): JSX.Element {
  const navigate = useNavigate();
  const [form, setForm] = useState<CreateHostRequest>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Test connection first
      await testHost(form);
      setTestPassed(true);
      setSuccess('Connection test successful');

      // Create host
      const createdHost = await createHost(form);
      setSuccess(`Host "${createdHost.name}" created successfully`);
      setForm(initialForm);

      if (onClose) {
        onClose();
      } else {
        navigate('/');
      }
    } catch (error) {
      logger.error('Setup failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError('Failed to set up host connection');
      setTestPassed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await testHost(form);
      setTestPassed(true);
      setSuccess('Connection test successful');
    } catch (error) {
      logger.error('Connection test failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError('Failed to test connection');
      setTestPassed(false);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TextField
        fullWidth
        label="Name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        disabled={loading}
        required
        margin="normal"
      />

      <TextField
        fullWidth
        label="Hostname"
        value={form.hostname}
        onChange={(e) => setForm((prev) => ({ ...prev, hostname: e.target.value }))}
        disabled={loading}
        required
        margin="normal"
      />

      <TextField
        fullWidth
        type="number"
        label="Port"
        value={form.port}
        onChange={(e) => setForm((prev) => ({ ...prev, port: Number(e.target.value) }))}
        disabled={loading}
        required
        margin="normal"
      />

      <TextField
        fullWidth
        label="Username"
        value={form.username}
        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
        disabled={loading}
        required
        margin="normal"
      />

      <TextField
        fullWidth
        type="password"
        label="Password"
        value={form.password}
        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
        disabled={loading}
        required
        margin="normal"
      />

      <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {onClose && (
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button onClick={handleTestConnection} disabled={loading} color="info">
          {loading ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button type="submit" disabled={loading || !testPassed} color="primary" variant="contained">
          {loading ? 'Saving...' : 'Save Host'}
        </Button>
      </Box>
    </Box>
  );

  if (open !== undefined && onClose !== undefined) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Host</DialogTitle>
        <DialogContent>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        <h2>Add New Host</h2>
        {content}
      </Box>
    </Box>
  );
}
