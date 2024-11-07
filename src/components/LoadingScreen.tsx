import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  useTheme,
  Fade,
} from '@mui/material';

interface LoadingScreenProps {
  message?: string;
  fullscreen?: boolean;
  delay?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullscreen = true,
  delay = 500,
}) => {
  const theme = useTheme();
  const [show, setShow] = React.useState(!delay);

  React.useEffect(() => {
    if (delay) {
      const timer = setTimeout(() => setShow(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!show) {
    return null;
  }

  const content = (
    <Fade in={show} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: fullscreen ? '100vh' : '100%',
          minHeight: fullscreen ? undefined : 200,
          bgcolor: theme.palette.background.default,
        }}
      >
        <CircularProgress
          size={48}
          thickness={4}
          sx={{
            color: theme.palette.primary.main,
            mb: 2,
          }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: theme.palette.text.secondary,
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          {message}
        </Typography>
      </Box>
    </Fade>
  );

  return fullscreen ? (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.modal + 1,
        bgcolor: theme.palette.background.default,
      }}
    >
      {content}
    </Box>
  ) : (
    content
  );
};

export default LoadingScreen;
