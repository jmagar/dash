import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
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
  Refresh as RestartIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useDockerCompose } from '../hooks/useDockerCompose';
import { logger } from '../utils/frontendLogger';
import LoadingScreen from './LoadingScreen';

interface DockerComposeProps {
  hostId: string;
}

export default function DockerCompose({ hostId }: DockerComposeProps): JSX.Element {
  const theme = useTheme();
  const [editMode, setEditMode] = useState(false);
  const [composeContent, setComposeContent] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'up' | 'down' | 'remove'>('up');
  
  const {
    loading,
    error,
    status,
    compose,
    loadCompose,
    saveCompose,
    upCompose,
    downCompose,
    removeCompose,
  } = useDockerCompose(hostId);

  const handleAction = async (action: 'up' | 'down' | 'remove') => {
    try {
      switch (action) {
        case 'up':
          await upCompose();
          break;
        case 'down':
          await downCompose();
          break;
        case 'remove':
          await removeCompose();
          break;
      }
    } catch (err) {
      logger.error(`Failed to ${action} docker-compose:`, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
    setShowConfirmDialog(false);
  };

  const handleSave = async () => {
    try {
      await saveCompose(composeContent);
      setEditMode(false);
    } catch (err) {
      logger.error('Failed to save docker-compose:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return theme.palette.success.main;
      case 'stopped':
        return theme.palette.error.main;
      case 'partial':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading Docker Compose..." />;
  }

  return (
    <Box p={3}>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Docker Compose
          </Typography>
          <Box display="flex" gap={1}>
            <Chip
              label={status}
              size="small"
              sx={{
                bgcolor: alpha(getStatusColor(status), 0.1),
                color: getStatusColor(status),
                fontWeight: 'medium',
              }}
            />
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
                    setComposeContent(compose);
                    setEditMode(true);
                  }}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ m: 2, borderRadius: 1 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void loadCompose()}
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
              {compose || 'No docker-compose.yml found'}
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
            disabled={!compose || status === 'running'}
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
            disabled={!compose || status === 'stopped'}
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
            disabled={!compose}
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
