import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import React, { useMemo } from 'react';

import { useDockerUpdates } from '../hooks';
import type { Stack } from '../types';

export default function ComposePage(): JSX.Element {
  const { data: rawStacks } = useDockerUpdates({
    enabled: true,
    type: 'stacks',
  });

  const stacks = useMemo(() => {
    return Array.isArray(rawStacks) ? rawStacks as Stack[] : [];
  }, [rawStacks]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Docker Compose Stacks</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Services</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stacks.map((stack) => (
              <TableRow key={stack.name}>
                <TableCell>{stack.name}</TableCell>
                <TableCell>{stack.services}</TableCell>
                <TableCell>{stack.status}</TableCell>
                <TableCell>
                  {new Date(stack.created).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
