import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Login as LoginIcon,
  Key as KeyIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Fade,
  Divider,
} from '@mui/material';

import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/frontendLogger';

export default function Login(): JSX.Element {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      logger.error('Login failed:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        p: 3,
      }}
    >
      <Fade in timeout={800}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <KeyIcon
              color="primary"
              sx={{
                fontSize: 48,
                mb: 1,
                animation: 'float 3s ease-in-out infinite',
                '@keyframes float': {
                  '0%, 100%': {
                    transform: 'translateY(0)',
                  },
                  '50%': {
                    transform: 'translateY(-10px)',
                  },
                },
              }}
            />
            <Typography variant="h4" fontWeight="bold" color="primary">
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Sign in to access your SSH remote management dashboard
            </Typography>
          </Box>

          <Divider />

          {error && (
            <Alert
              severity="error"
              sx={{ borderRadius: 1 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !username.trim() || !password.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{
                  mt: 2,
                  py: 1.5,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(45deg, ${alpha(
                      theme.palette.primary.main,
                      0
                    )} 30%, ${alpha(theme.palette.primary.light, 0.3)} 50%, ${alpha(
                      theme.palette.primary.main,
                      0
                    )} 70%)`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite linear',
                  },
                  '@keyframes shimmer': {
                    '0%': {
                      backgroundPosition: '200% 0',
                    },
                    '100%': {
                      backgroundPosition: '-200% 0',
                    },
                  },
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Box>
          </form>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Forgot your password?{' '}
              <Button
                color="primary"
                size="small"
                sx={{ textTransform: 'none', fontWeight: 'bold' }}
              >
                Reset it here
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}
