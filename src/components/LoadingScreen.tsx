import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';

interface LoadingScreenProps {
  message?: string;
  fullscreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullscreen = true,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        height: fullscreen ? '100vh' : '100%',
        width: '100%',
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="h6" color="textSecondary">
        {message}
      </Typography>
    </Box>
  );

  return content;
};

export default LoadingScreen;
