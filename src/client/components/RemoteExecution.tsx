import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Tooltip,
  Collapse,
  LinearProgress,
  Fade,
  Breadcrumbs,
  Link,
  Chip,
} from '@mui/material';
import {
  Send,
  Folder,
  Clear,
  History,
  Code,
  Terminal,
  ContentCopy,
  NavigateNext,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useHost } from '../hooks/useHost';
import { executeCommand } from '../api/remoteExecution.client';
import { logger } from '../utils/logger';
import type { CommandRequest, CommandResult } from '../../types/models-shared';

export function RemoteExecution() {
  const { selectedHost } = useHost({ autoConnect: false });
  const [command, setCommand] = useState('');
  const [workingDir, setWorkingDir] = useState('');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHost) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const cmd: CommandRequest = {
        command,
        args: [],
        cwd: workingDir || undefined,
      };

      const response = await executeCommand(selectedHost.id, cmd);
      setResult(response);

      if (response.status === 'failed') {
        setError('Command execution failed');
      }
    } catch (error) {
      logger.error('Command execution failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      setError('Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCommand('');
    setWorkingDir('');
    setResult(null);
    setError(null);
  };

  const handleCopyOutput = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleNavigateToHosts = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implement navigation to hosts page
    logger.info('Navigate to hosts page');
  };

  const handleNavigateToHost = (e: React.MouseEvent) => {
    e.preventDefault();
    // TODO: Implement navigation to host details page
    logger.info('Navigate to host details page');
  };

  if (!selectedHost) {
    return (
      <Box p={3}>
        <Typography>Please select a host first</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Breadcrumbs
        separator={<NavigateNext fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link color="inherit" href="#" onClick={handleNavigateToHosts}>
          Hosts
        </Link>
        <Link color="inherit" href="#" onClick={handleNavigateToHost}>
          {selectedHost.name}
        </Link>
        <Typography color="text.primary">Execute Command</Typography>
      </Breadcrumbs>

      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              Remote Command Execution
            </Typography>
            <Tooltip title="Command History">
              <IconButton
                onClick={() => setShowHistory(!showHistory)}
                color={showHistory ? 'primary' : 'default'}
              >
                <History />
              </IconButton>
            </Tooltip>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <Terminal color="action" sx={{ mr: 1 }} />
            <Typography color="textSecondary">
              Execute commands via agent on {selectedHost.name}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={loading}
              required
              margin="normal"
              placeholder="Enter command to execute"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Code />
                  </InputAdornment>
                ),
                endAdornment: command && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setCommand('')}
                      edge="end"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Working Directory"
              value={workingDir}
              onChange={(e) => setWorkingDir(e.target.value)}
              disabled={loading}
              margin="normal"
              placeholder="Optional: Specify working directory"
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Folder />
                  </InputAdornment>
                ),
              }}
            />

            <Box display="flex" gap={1} mt={2}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !command}
                startIcon={loading ? <CircularProgress size={20} /> : <Send />}
              >
                {loading ? 'Executing...' : 'Execute'}
              </Button>

              <Button
                variant="outlined"
                onClick={handleClear}
                disabled={loading || (!command && !workingDir && !result)}
              >
                Clear
              </Button>
            </Box>
          </form>

          {loading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
            </Box>
          )}

          <Collapse in={showHistory}>
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                Command History
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography color="textSecondary">
                  Command history will be displayed here
                </Typography>
              </Paper>
            </Box>
          </Collapse>

          <Fade in={Boolean(result)}>
            <Box mt={4}>
              {result && (
                <>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      Result
                    </Typography>
                    <Chip
                      label={result.status}
                      color={result.status === 'completed' ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>

                  {result.stdout && (
                    <Box mt={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          Output
                        </Typography>
                        <Tooltip title="Copy Output">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyOutput(result.stdout)}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          onClick={() => {
                            logger.info('Copy functionality not implemented yet');
                          }}
                          size="small"
                          title="Copy to clipboard"
                          disabled
                        >
                          <ContentCopyIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => {
                            logger.info('Download functionality not implemented yet');
                          }}
                          size="small"
                          title="Download output"
                          disabled
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Box>
                      <Paper variant="outlined">
                        <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {result.stdout}
                          </pre>
                        </Box>
                      </Paper>
                    </Box>
                  )}

                  {result.stderr && (
                    <Box mt={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          Error Output
                        </Typography>
                        <Tooltip title="Copy Error Output">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyOutput(result.stderr)}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Paper variant="outlined">
                        <Box sx={{ p: 2, backgroundColor: 'error.light' }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'error.contrastText' }}>
                            {result.stderr}
                          </pre>
                        </Box>
                      </Paper>
                    </Box>
                  )}

                  {result.completedAt && result.startedAt && (
                    <Typography color="textSecondary" sx={{ mt: 2 }}>
                      Duration: {Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000)}s
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Fade>
        </CardContent>
      </Card>
    </Box>
  );
}
