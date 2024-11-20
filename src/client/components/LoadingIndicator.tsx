import React from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { LoadingState } from '../hooks/useLoadingState';

interface LoadingIndicatorProps {
  loadingStates: { [key: string]: LoadingState };
}

export function LoadingIndicator({ loadingStates }: LoadingIndicatorProps) {
  const [expanded, setExpanded] = React.useState(true);
  const operations = Object.entries(loadingStates);

  if (operations.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 300,
        zIndex: 1200,
      }}
      elevation={3}
    >
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Background Operations ({operations.length})
        </Typography>
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ ml: 1 }}
        >
          {expanded ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
          {operations.map(([key, state]) => (
            <Box key={key} sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {state.message || 'Operation in progress...'}
                </Typography>
                <LinearProgress
                  variant={state.progress !== undefined ? 'determinate' : 'indeterminate'}
                  value={state.progress}
                  sx={{ height: 4, borderRadius: 1 }}
                />
              </Box>
              {state.progress !== undefined && (
                <Typography variant="caption" color="text.secondary">
                  {Math.round(state.progress)}% complete
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}
