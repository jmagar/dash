import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/frontendLogger';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  error?: string;
}

export function UserProfile(): JSX.Element {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json() as ChangePasswordResponse;

      if (!data.success) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password changed successfully');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      logger.error('Failed to change password:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent): void => {
    void handleSubmit(e);
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Please log in to view your profile.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          User Profile
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1">Username: {user.username}</Typography>
          <Typography variant="subtitle1">Email: {user.email}</Typography>
          <Typography variant="subtitle1">Role: {user.role}</Typography>
          <Typography variant="subtitle1">
            Created: {new Date(user.createdAt).toLocaleString()}
          </Typography>
          <Typography variant="subtitle1">
            Last Updated: {new Date(user.updatedAt).toLocaleString()}
          </Typography>
        </Box>

        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleFormSubmit}>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            type="password"
            label="New Password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />

          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
