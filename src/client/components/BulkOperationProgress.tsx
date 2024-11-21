import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  LinearProgress,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface OperationProgress {
  id: string;
  message: string;
  progress: number;
  completed?: boolean;
}

interface BulkOperationProgressProps {
  operations: OperationProgress[];
  onClose?: () => void;
}

export function BulkOperationProgress({ operations, onClose }: BulkOperationProgressProps) {
  const hasIncompleteOperations = operations.some(op => !op.completed);

  return (
    <Dialog 
      open={operations.length > 0}
      onClose={!hasIncompleteOperations ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">File Operations Progress</Typography>
        {!hasIncompleteOperations && (
          <Tooltip title="Close">
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {operations.map((operation) => (
          <Box key={operation.id} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {operation.message}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(operation.progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={operation.progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: (theme) => 
                  operation.completed 
                    ? theme.palette.success.light 
                    : theme.palette.grey[200],
                '& .MuiLinearProgress-bar': {
                  backgroundColor: (theme) => 
                    operation.completed 
                      ? theme.palette.success.main 
                      : theme.palette.primary.main,
                },
              }}
            />
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
