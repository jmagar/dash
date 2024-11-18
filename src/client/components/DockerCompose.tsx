import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Fade,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useDockerCompose } from '../hooks/useDockerCompose';
import { logger } from '../utils/frontendLogger';
import LoadingScreen from './LoadingScreen';
import type { DockerComposeConfig } from '@/types/models-shared';

interface DockerComposeProps {
  hostId: string;
}

interface DockerComposeConfigWithStatus extends DockerComposeConfig {
  status?: 'running' | 'stopped' | 'error';
}

export default function DockerCompose({ hostId }: DockerComposeProps) {
  const theme = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'up' | 'down' | 'remove'>('up');
  const [configName] = useState('docker-compose.yml');
  const [currentConfig, setCurrentConfig] = useState<DockerComposeConfigWithStatus | null>(null);

  const {
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    getConfig
  } = useDockerCompose(hostId);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getConfig(configName);
        if (config) {
          setComposeContent(config.content);
          setCurrentConfig({ ...config, status: 'stopped' });
        }
      } catch (err) {
        logger.error('Failed to load docker-compose config:', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    };
    void loadConfig();
  }, [getConfig, configName]);

  const handleAction = async (action: 'up' | 'down' | 'remove') => {
    try {
      switch (action) {
        case 'up':
          await createConfig(configName, composeContent);
          if (currentConfig) {
            setCurrentConfig({ ...currentConfig, status: 'running' });
          }
          break;
        case 'down':
          await deleteConfig(configName);
          if (currentConfig) {
            setCurrentConfig({ ...currentConfig, status: 'stopped' });
          }
          break;
        case 'remove':
          await deleteConfig(configName);
          setCurrentConfig(null);
          break;
      }
    } catch (err) {
      logger.error(`Failed to ${action} docker-compose:`, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      if (currentConfig) {
        setCurrentConfig({ ...currentConfig, status: 'error' });
      }
    }
    setShowConfirmDialog(false);
  };

  const handleSave = async () => {
    try {
      await updateConfig(configName, composeContent);
      if (currentConfig) {
        setCurrentConfig({ ...currentConfig, content: composeContent });
      }
      setEditMode(false);
    } catch (err) {
      logger.error('Failed to save docker-compose:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return theme.palette.success.main;
      case 'stopped':
        return theme.palette.error.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.warning.main;
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Docker Compose
        </Typography>
        <Box display="flex" gap={1}>
          {currentConfig && currentConfig.status && (
            <Chip
              label={currentConfig.status}
              size="small"
              sx={{
                bgcolor: alpha(getStatusColor(currentConfig.status), 0.1),
                color: getStatusColor(currentConfig.status),
                fontWeight: 'medium',
              }}
            />
          )}
          {editMode ? (
            <>
              <Tooltip title="Save changes">
                <IconButton
                  onClick={handleSave}
                  size="small"
                  color="primary"
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel editing">
                <IconButton
                  onClick={() => setEditMode(false)}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Edit compose file">
              <IconButton
                onClick={() => {
                  setComposeContent(currentConfig?.content || '');
                  setEditMode(true);
                }}
                size="small"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ m: 2, borderRadius: 1 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void getConfig(configName)}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Box p={2}>
          {editMode ? (
            <TextField
              multiline
              fullWidth
              minRows={20}
              maxRows={40}
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              sx={{
                '& .MuiInputBase-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                },
              }}
            />
          ) : (
            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                overflow: 'auto',
                maxHeight: 600,
              }}
            >
              {currentConfig?.content || 'No docker-compose.yml found'}
            </Box>
          )}
        </Box>

        <Divider />

        <Box
          sx={{
            p: 2,
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Button
            variant="contained"
            color="success"
            startIcon={<StartIcon />}
            onClick={() => {
              setDialogAction('up');
              setShowConfirmDialog(true);
            }}
            disabled={!currentConfig || currentConfig.status === 'running'}
          >
            Up
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={() => {
              setDialogAction('down');
              setShowConfirmDialog(true);
            }}
            disabled={!currentConfig || currentConfig.status === 'stopped'}
          >
            Down
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              setDialogAction('remove');
              setShowConfirmDialog(true);
            }}
            disabled={!currentConfig}
          >
            Remove
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        TransitionComponent={Fade}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          Confirm {dialogAction.charAt(0).toUpperCase() + dialogAction.slice(1)}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography>
              Are you sure you want to {dialogAction} the Docker Compose stack?
              {dialogAction === 'remove' && ' This action cannot be undone.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleAction(dialogAction)}
            color={dialogAction === 'up' ? 'success' : 'error'}
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
