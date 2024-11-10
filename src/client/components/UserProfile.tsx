import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { updateUser } from '../client/api';
import { useUserContext } from '../context/UserContext';
import type { User } from '../types';

interface UpdateUserData {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export default function UserProfile(): JSX.Element {
  const { user, setUser } = useUserContext();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const result = await updateUser({
        email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      setUser(result.data as User);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            User Profile
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e): void => setEmail(e.target.value)}
              margin="normal"
              type="email"
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Current Password"
              value={currentPassword}
              onChange={(e): void => setCurrentPassword(e.target.value)}
              margin="normal"
              type="password"
              disabled={loading}
            />
            <TextField
              fullWidth
              label="New Password"
              value={newPassword}
              onChange={(e): void => setNewPassword(e.target.value)}
              margin="normal"
              type="password"
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e): void => setConfirmPassword(e.target.value)}
              margin="normal"
              type="password"
              disabled={loading}
              error={newPassword !== confirmPassword}
              helperText={
                newPassword !== confirmPassword ? 'Passwords do not match' : ''
              }
            />
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
            {success && (
              <Typography color="success.main" sx={{ mt: 2 }}>
                Profile updated successfully
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
