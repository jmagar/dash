import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import React, { useState } from 'react';

import Terminal from './Terminal';
import type { Container, Host } from '../../types';
import { useDockerUpdates } from '../hooks';

export default function DockerContainers(): JSX.Element {
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const { data, loading } = useDockerUpdates({ type: 'containers' });

  // Type guard to ensure we're working with Container[]
  const containers = data as Container[] | null;

  const handleContainerSelect = (containerId: string): void => {
    setSelectedContainerId(containerId);
  };

  const renderContainerRow = (container: Container): JSX.Element => (
    <TableRow key={container.id}>
      <TableCell>{container.name}</TableCell>
      <TableCell>{container.image}</TableCell>
      <TableCell>{container.status}</TableCell>
      <TableCell>
        {container.ports?.join(', ') || 'No ports exposed'}
      </TableCell>
      <TableCell>
        <IconButton onClick={(): void => handleContainerSelect(container.id)}>
          Open Terminal
        </IconButton>
      </TableCell>
    </TableRow>
  );

  const mockHost: Host = {
    id: 1,
    name: selectedContainerId || '',
    hostname: 'localhost',
    port: 22,
    username: 'docker',
    status: 'connected',
    isActive: true,
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading containers...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Containers
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ports</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containers?.map((container) => renderContainerRow(container))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedContainerId && (
        <Terminal
          host={mockHost}
        />
      )}
    </Box>
  );
}