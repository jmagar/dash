import React, { useState } from 'react';

import {
  Avatar,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  useTheme,
  alpha,
  Tooltip,
  Fade,
  CircularProgress,
  Zoom,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  VpnKey as KeyIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';

import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/frontendLogger';

export function UserProfile() {
  const theme = useTheme();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;

    try {
      setError(null);
      setLoading(true);

      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      const response: Response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: { success: boolean; error?: string } = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess(true);
      setTimeout(() => {
        setEditing(false);
        setSuccess(false);
      }, 1500);
      
      logger.info('Profile updated successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
      logger.error('Profile update failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  if (!user) return null;

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          borderRadius: 2,
          transition: theme.transitions.create(['box-shadow']),
          '&:hover': {
            boxShadow: theme.shadows[6],
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 4,
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: theme.palette.primary.main,
              transition: theme.transitions.create(['transform', 'box-shadow']),
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {user.username}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: alpha(theme.palette.text.secondary, 0.8),
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {user.role}
            </Typography>
          </Box>
          <Tooltip title={editing ? "Cancel editing" : "Edit profile"}>
            <IconButton
              onClick={() => editing ? handleCancel() : setEditing(true)}
              sx={{
                ml: 'auto',
                transition: theme.transitions.create(['transform', 'background-color']),
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
              color={editing ? 'error' : 'primary'}
            >
              {editing ? <CancelIcon /> : <EditIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Fade in={error !== null}>
          <Box sx={{ mb: 3 }}>
            {error && (
              <Alert 
                severity="error" 
                onClose={() => setError(null)}
                sx={{
                  '& .MuiAlert-message': {
                    display: 'flex',
                    alignItems: 'center',
                  },
                }}
              >
                {error}
              </Alert>
            )}
          </Box>
        </Fade>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={!editing}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: <PersonIcon color="action" sx={{ mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  transition: theme.transitions.create(['box-shadow']),
                  '&.Mui-focused': {
                    boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
                  },
                },
              }}
            />

            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={!editing}
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  transition: theme.transitions.create(['box-shadow']),
                  '&.Mui-focused': {
                    boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
                  },
                },
              }}
            />

            <Zoom in={editing} unmountOnExit>
              <Box>
                <Divider sx={{ my: 2 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: alpha(theme.palette.text.secondary, 0.8),
                      px: 1,
                    }}
                  >
                    Change Password
                  </Typography>
                </Divider>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      startAdornment: <KeyIcon color="action" sx={{ mr: 1 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: theme.transitions.create(['box-shadow']),
                        '&.Mui-focused': {
                          boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
                        },
                      },
                    }}
                  />

                  <TextField
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      startAdornment: <KeyIcon color="action" sx={{ mr: 1 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: theme.transitions.create(['box-shadow']),
                        '&.Mui-focused': {
                          boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
                        },
                      },
                    }}
                  />

                  <TextField
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      startAdornment: <KeyIcon color="action" sx={{ mr: 1 }} />,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: theme.transitions.create(['box-shadow']),
                        '&.Mui-focused': {
                          boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            </Zoom>

            <Zoom in={editing} unmountOnExit>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : success ? (
                    <SuccessIcon />
                  ) : (
                    <SaveIcon />
                  )
                }
                sx={{
                  mt: 2,
                  height: 48,
                  position: 'relative',
                  transition: theme.transitions.create(
                    ['background-color', 'box-shadow', 'transform'],
                    { duration: theme.transitions.duration.short }
                  ),
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: theme.shadows[4],
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                    boxShadow: theme.shadows[2],
                  },
                  ...(success && {
                    bgcolor: theme.palette.success.main,
                    '&:hover': {
                      bgcolor: theme.palette.success.dark,
                    },
                  }),
                }}
              >
                {success ? 'Changes Saved!' : 'Save Changes'}
              </Button>
            </Zoom>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
