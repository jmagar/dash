import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  IconButton,
  Alert,
  Theme,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAsync, useDebounce, useKeyPress, useLocalStorage } from '../hooks';
import { updateUser } from '../api/auth';
import { useUserContext } from '../context/UserContext';
import { User, UserPreferences, DEFAULT_USER_PREFERENCES } from '../types';
import LoadingScreen from './LoadingScreen';

const AVAILABLE_THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const AVAILABLE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

const TERMINAL_FONTS = [
  { value: 'monospace', label: 'Monospace' },
  { value: 'Consolas', label: 'Consolas' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Fira Code', label: 'Fira Code' },
];

const UserProfile: React.FC = () => {
  const { user, updateUserContext } = useUserContext();
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'user.preferences',
    DEFAULT_USER_PREFERENCES
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const debouncedPreferences = useDebounce(preferences, { delay: 500 });

  const {
    loading,
    error,
    execute: savePreferences,
  } = useAsync<User>(
    async () => {
      if (!user) throw new Error('No user logged in');

      const response = await updateUser(user.id, {
        ...user,
        preferences: debouncedPreferences,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update preferences');
      }

      updateUserContext(response.data);
      setSuccessMessage('Preferences saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      return response.data;
    },
    {
      onError: (error) => {
        console.error('Failed to save preferences:', error);
      },
    }
  );

  const handlePreferenceChange = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useKeyPress('s', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      void savePreferences();
    }
  });

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">No user logged in</Typography>
      </Box>
    );
  }

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Saving preferences..." />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">User Profile</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => void savePreferences()}
          disabled={loading}
        >
          Save Preferences (Ctrl+S)
        </Button>
      </Box>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Information
          </Typography>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Username"
              value={user.username}
              disabled
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              value={user.email}
              disabled
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Role"
              value={user.role}
              disabled
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Preferences
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <FormControl>
              <InputLabel>Theme</InputLabel>
              <Select
                value={preferences.theme}
                label="Theme"
                onChange={(e) => handlePreferenceChange('theme', e.target.value as UserPreferences['theme'])}
              >
                {AVAILABLE_THEMES.map((theme) => (
                  <MenuItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <InputLabel>Language</InputLabel>
              <Select
                value={preferences.language}
                label="Language"
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
              >
                {AVAILABLE_LANGUAGES.map((lang) => (
                  <MenuItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <InputLabel>Terminal Font</InputLabel>
              <Select
                value={preferences.terminalFontFamily}
                label="Terminal Font"
                onChange={(e) => handlePreferenceChange('terminalFontFamily', e.target.value)}
              >
                {TERMINAL_FONTS.map((font) => (
                  <MenuItem key={font.value} value={font.value}>
                    {font.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="number"
              label="Terminal Font Size"
              value={preferences.terminalFontSize}
              onChange={(e) => handlePreferenceChange('terminalFontSize', parseInt(e.target.value, 10))}
              inputProps={{ min: 8, max: 32 }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserProfile;
