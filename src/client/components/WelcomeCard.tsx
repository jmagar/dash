import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Fade,
  useTheme,
  CardActions,
  Divider,
  Stack,
  Avatar,
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

interface WelcomeCardProps {
  username: string;
  onGetStarted?: () => void;
}

export function WelcomeCard({ username, onGetStarted }: WelcomeCardProps): JSX.Element {
  const theme = useTheme();

  const features = [
    {
      icon: <TerminalIcon />,
      title: 'Remote Terminal',
      description: 'Access and manage your remote systems through a secure terminal interface',
    },
    {
      icon: <StorageIcon />,
      title: 'File Management',
      description: 'Browse, edit, and transfer files across your remote hosts',
    },
    {
      icon: <CodeIcon />,
      title: 'Process Control',
      description: 'Monitor and manage running processes with detailed analytics',
    },
    {
      icon: <SecurityIcon />,
      title: 'Secure Access',
      description: 'Enterprise-grade security with encrypted connections and access controls',
    },
  ];

  return (
    <Fade in timeout={800}>
      <Card
        elevation={3}
        sx={{
          maxWidth: 800,
          mx: 'auto',
          borderRadius: 2,
          overflow: 'visible',
          position: 'relative',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -24,
            left: 24,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            p: 1,
            boxShadow: theme.shadows[4],
          }}
        >
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.dark',
              fontSize: '1.5rem',
            }}
          >
            {username.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        <CardContent sx={{ pt: 5 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'primary.main',
              textAlign: 'center',
              mb: 3,
            }}
          >
            Welcome, {username}!
          </Typography>

          <Typography
            variant="subtitle1"
            color="textSecondary"
            sx={{ textAlign: 'center', mb: 4 }}
          >
            Get started with our powerful remote system management tools
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            sx={{
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {features.map((feature, index) => (
              <Box
                key={index}
                sx={{
                  textAlign: 'center',
                  flex: '1 1 200px',
                  maxWidth: 250,
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    p: 1.5,
                    borderRadius: '50%',
                    bgcolor: `primary.${index % 2 ? 'light' : 'dark'}`,
                    color: 'primary.contrastText',
                    mb: 2,
                  }}
                >
                  {React.cloneElement(feature.icon as React.ReactElement, {
                    fontSize: 'large',
                  })}
                </Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: 'medium' }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{ lineHeight: 1.6 }}
                >
                  {feature.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>

        <CardActions sx={{ p: 3, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={onGetStarted}
            sx={{
              px: 4,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 'medium',
              '&:hover': {
                transform: 'translateY(-2px)',
                transition: 'transform 0.2s',
              },
            }}
          >
            Get Started
          </Button>
        </CardActions>
      </Card>
    </Fade>
  );
}
