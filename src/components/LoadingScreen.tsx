import {
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullscreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullscreen = true,
}) => {
  const boxProps = fullscreen ? {
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } : {};

  return (
    <Box sx={boxProps}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body1">{message}</Typography>
      </Box>
    </Box>
  );
};

export default LoadingScreen;
