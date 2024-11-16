import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Fade,
  useTheme,
  Paper,
  LinearProgress,
} from '@mui/material';

interface LoadingScreenProps {
  fullscreen?: boolean;
  message?: string;
  variant?: 'circular' | 'linear';
  overlay?: boolean;
  delay?: number;
  minHeight?: number | string;
}

export default function LoadingScreen({
  fullscreen = false,
  message = 'Loading...',
  variant = 'circular',
  overlay = false,
  delay = 500,
  minHeight = 400,
}: LoadingScreenProps): JSX.Element {
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
          minHeight: fullscreen ? '100vh' : minHeight,
          width: '100%',
          position: overlay ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          zIndex: overlay ? theme.zIndex.modal : 1,
          backgroundColor: overlay
            ? alpha(theme.palette.background.paper, 0.9)
            : 'transparent',
          backdropFilter: overlay ? 'blur(4px)' : 'none',
        }}
      >
        <Paper
          elevation={overlay ? 3 : 0}
          sx={{
            p: 4,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            backgroundColor: overlay
              ? theme.palette.background.paper
              : 'transparent',
            boxShadow: overlay ? theme.shadows[3] : 'none',
          }}
        >
          {variant === 'circular' ? (
            <CircularProgress
              size={48}
              thickness={4}
              sx={{
                color: theme.palette.primary.main,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    transform: 'scale(0.95)',
                    boxShadow: '0 0 0 0 rgba(0, 0, 0, 0.3)',
                  },
                  '70%': {
                    transform: 'scale(1)',
                    boxShadow: '0 0 0 10px rgba(0, 0, 0, 0)',
                  },
                  '100%': {
                    transform: 'scale(0.95)',
                    boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)',
                  },
                },
              }}
            />
          ) : (
            <Box sx={{ width: '100%', maxWidth: 400 }}>
              <LinearProgress
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundImage: `linear-gradient(45deg, 
                      ${theme.palette.primary.main} 25%, 
                      ${theme.palette.primary.light} 50%, 
                      ${theme.palette.primary.main} 75%
                    )`,
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite linear',
                  },
                  '@keyframes shimmer': {
                    '0%': {
                      backgroundPosition: '200% 0',
                    },
                    '100%': {
                      backgroundPosition: '-200% 0',
                    },
                  },
                }}
              />
            </Box>
          )}
          {message && (
            <Typography
              variant="h6"
              color="textSecondary"
              sx={{
                animation: 'fadeInOut 2s infinite',
                '@keyframes fadeInOut': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.6 },
                },
              }}
            >
              {message}
            </Typography>
          )}
        </Paper>
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
        backgroundColor: theme.palette.background.default,
      }}
    >
      {content}
    </Box>
  ) : (
    content
  );
}
