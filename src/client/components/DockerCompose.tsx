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
    const result = await getStackComposeFile(stackName);
    if (!result.success) {
      throw new Error(result.error || 'Failed to load compose file');
    }
    return result.data || '';
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
    }
  }, [open, stackName, loadFile]);

  const handleSave = async (): Promise<void> => {
    try {
      setError(null);
      const result = stackName
        ? await updateStackComposeFile(stackName, composeFile)
        : await createStack(stackName, composeFile);

      if (result.success) {
        onSave();
        onClose();
      } else {
        setError(result.error || 'Failed to save compose file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        <Button onClick={(): void => void handleSave()} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
