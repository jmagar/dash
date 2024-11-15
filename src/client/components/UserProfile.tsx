import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../api/auth.client';
import { logger } from '../utils/logger';

import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from '@mui/material';

interface PasswordChangeForm {
  currentPassword?: string;
  newPassword?: string;
}

export function UserProfile(): JSX.Element {
  const { authState, setAuthState } = useAuth();
  const [email, setEmail] = useState(authState.user?.email || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!authState.user) {
    return <div>Please log in to view your profile.</div>;
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const updatedUser = await updateUser({
        ...authState.user,
        email,
      });

      setAuthState({
        ...authState,
        user: updatedUser,
      });

      setSuccess('Profile updated successfully');
    } catch (err) {
      logger.error('Failed to update profile:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to update profile');
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            User Profile
          </Typography>
          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
          {success && (
            <Typography color="success.main" sx={{ mt: 2 }}>
              {success}
            </Typography>
          )}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Username</label>
              <div>{authState.user.username}</div>
            </div>
            <div className="field">
              <label>Role</label>
              <div>{authState.user.role}</div>
            </div>
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e): void => setEmail(e.target.value)}
              margin="normal"
              type="email"
            />
            <Button
              fullWidth
              variant="contained"
              type="submit"
              sx={{ mt: 3 }}
            >
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
