import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../api/auth';
import { useUserContext } from '../context/UserContext';

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const { setUser } = useUserContext();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mfaToken, setMfaToken] = useState<string>('');
  const [showMfa, setShowMfa] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(username, password, mfaToken);

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.mfaRequired) {
        setShowMfa(true);
        setLoading(false);
        return;
      }

      if (result.data && result.token) {
        if (rememberMe) {
          localStorage.setItem('token', result.token);
        } else {
          sessionStorage.setItem('token', result.token);
        }
        setUser(result.data);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

  const handleMfaTokenChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setMfaToken(e.target.value);
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setRememberMe(e.target.checked);
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            SSH Remote Management
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={handleUsernameChange}
              margin="normal"
              disabled={loading || showMfa}
              autoFocus
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              margin="normal"
              disabled={loading || showMfa}
            />
            {showMfa && (
              <TextField
                fullWidth
                label="MFA Code"
                value={mfaToken}
                onChange={handleMfaTokenChange}
                margin="normal"
                disabled={loading}
                autoFocus
              />
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                  disabled={loading}
                />
              }
              label="Remember me"
              sx={{ mt: 1 }}
            />
            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading || !username || !password || (showMfa && !mfaToken)}
              sx={{ mt: 3 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
