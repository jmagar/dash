import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useUserContext } from '../context/UserContext';
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

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUserContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              disabled={loading || showMfa}
              autoFocus
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              disabled={loading || showMfa}
            />
            {showMfa && (
              <TextField
                fullWidth
                label="MFA Code"
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                margin="normal"
                disabled={loading}
                autoFocus
              />
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
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
};

export default Login;
