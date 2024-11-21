import React from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Paper,
  Grid,
  Select,
  MenuItem,
  Button,
  Alert,
  styled,
} from '@mui/material';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../hooks/useAuth';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  minWidth: 200,
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  fontFamily: 'Noto Sans, sans-serif',
}));

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultView: 'list' | 'grid';
  showHiddenFiles: boolean;
  confirmDelete: boolean;
  enableShortcuts: boolean;
  sortBy: 'name' | 'date' | 'size';
  sortDirection: 'asc' | 'desc';
}

interface UserSettingsProps {
  settings: UserPreferences;
}

const UserSettings: React.FC<UserSettingsProps> = ({ settings }) => {
  const { updateSettings, saveSettings } = useSettings();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  const handleChange = (field: keyof UserPreferences) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    
    updateSettings('user', { [field]: value });
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    try {
      await saveSettings('user', settings);
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      setSuccess(false);
    }
  };

  return (
    <Box>
      <StyledTypography variant="h5" component="h2">
        User Settings
      </StyledTypography>

      <StyledPaper>
        <Grid container spacing={3}>
          {/* Appearance */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">Appearance</StyledTypography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <Select
                    value={settings.theme}
                    onChange={handleChange('theme')}
                    displayEmpty
                    label="Theme"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System</MenuItem>
                  </Select>
                </StyledFormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <Select
                    value={settings.language}
                    onChange={handleChange('language')}
                    displayEmpty
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                  </Select>
                </StyledFormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* File Explorer */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">File Explorer</StyledTypography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <Select
                    value={settings.defaultView}
                    onChange={handleChange('defaultView')}
                    displayEmpty
                    label="Default View"
                  >
                    <MenuItem value="list">List</MenuItem>
                    <MenuItem value="grid">Grid</MenuItem>
                  </Select>
                </StyledFormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <Select
                    value={settings.sortBy}
                    onChange={handleChange('sortBy')}
                    displayEmpty
                    label="Sort By"
                  >
                    <MenuItem value="name">Name</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="size">Size</MenuItem>
                  </Select>
                </StyledFormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.showHiddenFiles}
                    onChange={handleChange('showHiddenFiles')}
                  />
                }
                label="Show Hidden Files"
              />
            </Box>
          </Grid>

          {/* Behavior */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">Behavior</StyledTypography>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.confirmDelete}
                    onChange={handleChange('confirmDelete')}
                  />
                }
                label="Confirm Before Delete"
              />
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableShortcuts}
                    onChange={handleChange('enableShortcuts')}
                  />
                }
                label="Enable Keyboard Shortcuts"
              />
            </Box>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Settings saved successfully!
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Box>
      </StyledPaper>
    </Box>
  );
};

export default UserSettings;
