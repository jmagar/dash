import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  TextField,
} from '@mui/material';
import React, { useState } from 'react';

import { addHost, testConnection } from '../api/hosts';
import { useClickOutside } from '../hooks';
import type { Host } from '../types/models';

interface HostSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (hosts: Host[]) => void;
  _multiSelect?: boolean; // Prefixed with _ to silence unused var warning
}

interface HostFormData {
  name: string;
  hostname: string;
  port: number;
  username: string;
  saveCredentials: boolean;
  password?: string;
  privateKey?: string;
}

const defaultFormData: HostFormData = {
  name: '',
  hostname: '',
  port: 22,
  username: '',
  saveCredentials: false,
  password: '',
  privateKey: '',
};

export default function HostSelector({
  open,
  onClose,
  onSelect,
  _multiSelect = false,
}: HostSelectorProps): JSX.Element {
  const [formData, setFormData] = useState<HostFormData>(defaultFormData);
  const [_error, setError] = useState<string | null>(null); // Prefixed with _ to silence unused var warning
  const [testing, setTesting] = useState<boolean>(false);

  const dialogRef = useClickOutside<HTMLDivElement>(onClose);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTest = async (): Promise<void> => {
    try {
      setTesting(true);
      setError(null);

      const result = await testConnection({
        name: formData.name,
        hostname: formData.hostname,
        port: Number(formData.port),
        username: formData.username,
        credentials: {
          password: formData.password || undefined,
          privateKey: formData.privateKey || undefined,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Connection test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setError(null);

      const result = await addHost({
        name: formData.name,
        hostname: formData.hostname,
        port: Number(formData.port),
        username: formData.username,
        credentials: formData.saveCredentials ? {
          password: formData.password,
          privateKey: formData.privateKey,
        } : undefined,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to add host');
      }

      onSelect([result.data]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add host');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      ref={dialogRef}
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>Add New Host</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                label="Hostname"
                name="hostname"
                value={formData.hostname}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Port"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Private Key"
                name="privateKey"
                value={formData.privateKey}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="saveCredentials"
                    checked={formData.saveCredentials}
                    onChange={handleInputChange}
                  />
                }
                label="Save credentials"
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleTest}
          disabled={testing}
        >
          Test Connection
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={testing}
        >
          Add Host
        </Button>
      </DialogActions>
    </Dialog>
  );
}
