import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
  Typography,
  Box
} from '@mui/material';
import type { FileUploadProgress } from '../../../../../types/files';

interface BulkOperationProgressProps {
  open: boolean;
  operations: FileUploadProgress[];
}

export function BulkOperationProgress({
  open,
  operations
}: BulkOperationProgressProps): JSX.Element {
  const inProgress = operations.some(op => !op.completed);

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle>File Operations Progress</DialogTitle>
      <DialogContent>
        {operations.map(operation => (
          <Box key={operation.id} sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              {operation.message}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={operation.progress}
              color={operation.completed ? 'success' : 'primary'}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {operation.completed
                ? 'Completed'
                : `${Math.round(operation.progress)}%`}
            </Typography>
          </Box>
        ))}
        {!inProgress && (
          <Typography variant="body1" color="success.main" align="center">
            All operations completed successfully
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
} 