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
  Button,
  Alert,
  styled,
  Select,
  MenuItem,
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

interface AdminConfig {
  // Storage
  storagePath: string;
  maxStoragePerUser: number;
  maxFileSize: number;
  
  // Security
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireTwoFactor: boolean;
  
  // Network
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;
  
  // User Management
  defaultUserRole: 'user' | 'admin';
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
}

interface AdminSettingsProps {
  settings: AdminConfig;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ settings }) => {
  const { user } = useAuth();
  const { updateSettings, saveSettings } = useSettings();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);

  const handleChange = (field: keyof AdminConfig) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.type === 'checkbox'
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    
    updateSettings('admin', { [field]: value });
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    try {
      await saveSettings('admin', settings);
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      setSuccess(false);
    }
  };

  if (!user?.isAdmin) {
    return (
      <Alert severity="error">
        You don't have permission to access admin settings.
      </Alert>
    );
  }

  return (
    <Box>
      <StyledTypography variant="h5" component="h2">
        Admin Settings
      </StyledTypography>

      <StyledPaper>
        <Grid container spacing={3}>
          {/* Storage Settings */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">Storage</StyledTypography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <StyledFormControl fullWidth>
                  <TextField
                    label="Storage Path"
                    value={settings.storagePath}
                    onChange={handleChange('storagePath')}
                  />
                </StyledFormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <TextField
                    label="Max Storage Per User (MB)"
                    type="number"
                    value={settings.maxStoragePerUser}
                    onChange={handleChange('maxStoragePerUser')}
                  />
                </StyledFormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <TextField
                    label="Max File Size (MB)"
                    type="number"
                    value={settings.maxFileSize}
                    onChange={handleChange('maxFileSize')}
                  />
                </StyledFormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">Security</StyledTypography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <TextField
                    label="Session Timeout (minutes)"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={handleChange('sessionTimeout')}
                  />
                </StyledFormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <TextField
                    label="Max Login Attempts"
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={handleChange('maxLoginAttempts')}
                  />
                </StyledFormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <TextField
                    label="Minimum Password Length"
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={handleChange('passwordMinLength')}
                  />
                </StyledFormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireTwoFactor}
                      onChange={handleChange('requireTwoFactor')}
                    />
                  }
                  label="Require Two-Factor Authentication"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* User Management */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">User Management</StyledTypography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <StyledFormControl fullWidth>
                  <Select
                    value={settings.defaultUserRole}
                    onChange={handleChange('defaultUserRole')}
                    label="Default User Role"
                  >
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </StyledFormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowUserRegistration}
                      onChange={handleChange('allowUserRegistration')}
                    />
                  }
                  label="Allow User Registration"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireEmailVerification}
                      onChange={handleChange('requireEmailVerification')}
                    />
                  }
                  label="Require Email Verification"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Network Settings */}
          <Grid item xs={12}>
            <StyledTypography variant="h6">Network</StyledTypography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.proxyEnabled}
                      onChange={handleChange('proxyEnabled')}
                    />
                  }
                  label="Enable Proxy"
                />
              </Grid>
              {settings.proxyEnabled && (
                <>
                  <Grid item xs={12} md={6}>
                    <StyledFormControl fullWidth>
                      <TextField
                        label="Proxy Host"
                        value={settings.proxyHost}
                        onChange={handleChange('proxyHost')}
                      />
                    </StyledFormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <StyledFormControl fullWidth>
                      <TextField
                        label="Proxy Port"
                        type="number"
                        value={settings.proxyPort}
                        onChange={handleChange('proxyPort')}
                      />
                    </StyledFormControl>
                  </Grid>
                </>
              )}
            </Grid>
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

export default AdminSettings;
