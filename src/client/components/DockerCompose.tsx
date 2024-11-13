import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';

import { createStack, updateStackComposeFile, getStackComposeFile } from '../api';
import CodeEditor from './CodeEditor';
import { useAsync } from '../hooks';
import { logger } from '../utils/frontendLogger';

interface Props {
  stackName: string;
  onClose: () => void;
  onSave: () => void;
  open: boolean;
}

export default function DockerCompose({ stackName, onClose, onSave, open }: Props): JSX.Element {
  const [composeFile, setComposeFile] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadComposeFile = useCallback(async () => {
    if (!stackName) return '';

    try {
      logger.info('Loading compose file', { stackName });
      const result = await getStackComposeFile(stackName);
      if (!result.success) {
        throw new Error(result.error || 'Failed to load compose file');
      }
      logger.info('Compose file loaded successfully', { stackName });
      return result.data || '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load compose file';
      logger.error('Error loading compose file:', { error: errorMessage, stackName });
      throw err;
    }
  }, [stackName]);

  const {
    loading,
    error: loadError,
    execute: loadFile,
  } = useAsync(loadComposeFile, {
    immediate: false,
  });

  useEffect(() => {
    if (open && stackName) {
      void loadFile().then((content) => {
        if (content) {
          setComposeFile(content);
        }
      });
    } else if (open) {
      // Clear compose file when creating new stack
      setComposeFile('');
    }
  }, [open, stackName, loadFile]);

  const handleSave = async (): Promise<void> => {
    try {
      setError(null);
      if (!composeFile.trim()) {
        setError('Compose file cannot be empty');
        return;
      }

      let result;
      if (stackName) {
        logger.info('Updating stack compose file', { stackName });
        result = await updateStackComposeFile(stackName, composeFile);
      } else {
        logger.info('Creating new stack');
        result = await createStack('new-stack', composeFile);
      }

      if (result.success) {
        logger.info(stackName ? 'Stack updated successfully' : 'Stack created successfully',
          stackName ? { stackName } : undefined);
        onSave();
        onClose();
      } else {
        const errorMessage = result.error || 'Failed to save compose file';
        logger.error('Error saving compose file:', { error: errorMessage, stackName });
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      logger.error('Error in compose file operation:', { error: errorMessage, stackName });
      setError(errorMessage);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {stackName ? `Edit ${stackName} Compose File` : 'Create New Stack'}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : loadError ? (
          <Typography color="error">{loadError}</Typography>
        ) : (
          <Box sx={{ height: '60vh' }}>
            <CodeEditor
              value={composeFile}
              onChange={setComposeFile}
              language="yaml"
              theme="vs-dark"
            />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={(): void => void handleSave()}
          variant="contained"
          disabled={!composeFile.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
