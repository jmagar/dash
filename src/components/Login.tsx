import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, registerUser } from 'src/api/auth';
import { AuthResult, UserRegistration } from 'src/types';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      let result: AuthResult;

      if (isLogin) {
        result = await login(username, password, mfaToken);

        if (result.success) {
          if (result.mfaRequired) {
            setMfaRequired(true);
          } else {
            localStorage.setItem('token', result.token || '');
            navigate('/');
          }
        } else {
          setError(result.error || 'Login failed');
        }
      } else {
        const registrationData: UserRegistration = {
          username,
          password,
          email,
        };

        result = await registerUser(registrationData);

        if (result.success) {
          setIsLogin(true);
          setError('Registration successful. Please log in.');
        } else {
          setError(result.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h4" gutterBottom align="center">
          {mfaRequired ? 'Two-Factor Authentication' : (isLogin ? 'Login' : 'Register')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {!mfaRequired ? (
            <>
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                required
                variant="outlined"
                autoComplete="username"
              />

              {!isLogin && (
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  variant="outlined"
                  autoComplete="email"
                />
              )}

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                variant="outlined"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          ) : (
            <TextField
              fullWidth
              label="MFA Token"
              value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value)}
              margin="normal"
              required
              variant="outlined"
              helperText="Enter the 6-digit code from your authenticator app"
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 2, mb: 2 }}
          >
            {mfaRequired ? 'Verify' : (isLogin ? 'Login' : 'Register')}
          </Button>

          {!mfaRequired && (
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setIsLogin(!isLogin)}
                sx={{ cursor: 'pointer' }}
              >
                {isLogin
                  ? 'Need an account? Register'
                  : 'Already have an account? Login'}
              </Link>
            </Box>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
