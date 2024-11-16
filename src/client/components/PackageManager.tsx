import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  TextField,
  Typography,
  Paper,
  Card,
  CardContent,
  InputAdornment,
  Alert,
  CircularProgress,
  Tooltip,
  Fade,
  useTheme,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Update as UpdateIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import {
  listPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  searchPackages,
} from '../api/packageManager.client';
import type { Package } from '../../types/models-shared';
import { logger } from '../utils/frontendLogger';

export function PackageManager() {
  const theme = useTheme();
  const { hostId } = useParams<{ hostId: string }>();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [packageName, setPackageName] = useState('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const loadPackages = useCallback(async () => {
    if (!hostId) {
      setError('No host ID provided');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await listPackages(hostId);
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  const handleInstall = useCallback(async () => {
    if (!hostId || !packageName.trim()) return;

    try {
      setActionLoading(prev => ({ ...prev, install: true }));
      setError(null);
      await installPackage(hostId, packageName);
      await loadPackages();
      setPackageName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install package');
    } finally {
      setActionLoading(prev => ({ ...prev, install: false }));
    }
  }, [hostId, packageName, loadPackages]);

  const handleUninstall = useCallback(async (name: string) => {
    if (!hostId) return;

    try {
      setActionLoading(prev => ({ ...prev, [name]: true }));
      setError(null);
      await uninstallPackage(hostId, name);
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall package');
    } finally {
      setActionLoading(prev => ({ ...prev, [name]: false }));
    }
  }, [hostId, loadPackages]);

  const handleUpdate = useCallback(async (name: string) => {
    if (!hostId) return;

    try {
      setActionLoading(prev => ({ ...prev, [name]: true }));
      setError(null);
      await updatePackage(hostId, name);
      await loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update package');
    } finally {
      setActionLoading(prev => ({ ...prev, [name]: false }));
    }
  }, [hostId, loadPackages]);

  const handleSearch = useCallback(async () => {
    if (!hostId || !searchQuery.trim()) {
      void loadPackages();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await searchPackages(hostId, searchQuery);
      setPackages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search packages');
    } finally {
      setLoading(false);
    }
  }, [hostId, searchQuery, loadPackages]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  if (!hostId) {
    return (
      <Box p={3}>
        <Typography color="error">No host ID provided</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Card elevation={3}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
              <CodeIcon color="primary" />
              <Typography variant="h5">Package Manager</Typography>
            </Box>
            <Tooltip title="Refresh packages">
              <IconButton
                onClick={() => void loadPackages()}
                disabled={loading}
                sx={{
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'rotate(180deg)',
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box display="flex" gap={2} mb={3}>
            <TextField
              label="Search packages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && void handleSearch()}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={() => void handleSearch()}
              disabled={loading}
              sx={{ minWidth: 100 }}
            >
              Search
            </Button>
          </Box>

          <Box display="flex" gap={2} mb={3}>
            <TextField
              label="Package name"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && void handleInstall()}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CodeIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: packageName && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setPackageName('')}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              startIcon={
                actionLoading.install ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <AddIcon />
                )
              }
              onClick={() => void handleInstall()}
              disabled={!packageName.trim() || actionLoading.install}
              sx={{ minWidth: 120 }}
            >
              Install
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 1 }}>
              <List sx={{ width: '100%' }}>
                {packages.map((pkg, index) => (
                  <React.Fragment key={pkg.name}>
                    {index > 0 && <Divider />}
                    <ListItem
                      sx={{
                        py: 2,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon>
                        <CodeIcon color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={pkg.name}
                        secondary={pkg.version}
                        primaryTypographyProps={{
                          variant: 'subtitle2',
                          fontWeight: 'medium',
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'text.secondary',
                        }}
                      />
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Update package">
                            <span>
                              <IconButton
                                onClick={() => void handleUpdate(pkg.name)}
                                disabled={actionLoading[pkg.name]}
                                size="small"
                                sx={{
                                  bgcolor: 'background.paper',
                                  '&:hover': {
                                    bgcolor: theme.palette.primary.main,
                                    color: 'white',
                                  },
                                }}
                              >
                                {actionLoading[pkg.name] ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <UpdateIcon />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Uninstall package">
                            <IconButton
                              onClick={() => void handleUninstall(pkg.name)}
                              disabled={actionLoading[pkg.name]}
                              size="small"
                              color="error"
                              sx={{
                                bgcolor: 'background.paper',
                                '&:hover': {
                                  bgcolor: theme.palette.error.main,
                                  color: 'white',
                                },
                              }}
                            >
                              {actionLoading[pkg.name] ? (
                                <CircularProgress size={20} />
                              ) : (
                                <DeleteIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
                {packages.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No packages found"
                      sx={{ textAlign: 'center', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
