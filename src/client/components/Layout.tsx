import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { logout } from '../api';
import Navigation from './Navigation';
import { useUserContext } from '../context/UserContext';

interface Props {
  children: React.ReactNode;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export default function Layout({ children, toggleTheme, isDarkMode }: Props): JSX.Element {
  const navigate = useNavigate();
  const { user, setUser } = useUserContext();

  const handleLogout = async (): Promise<void> => {
    const result = await logout();
    if (result.success) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SSH Remote Management
          </Typography>
          {user && (
            <>
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user.username}
              </Typography>
              <IconButton
                color="inherit"
                onClick={toggleTheme}
                sx={{ mr: 1 }}
              >
                {isDarkMode ? <LightIcon /> : <DarkIcon />}
              </IconButton>
              <IconButton
                color="inherit"
                onClick={handleLogout}
                aria-label="logout"
              >
                <LogoutIcon />
              </IconButton>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexGrow: 1,
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        {user && <Navigation />}
        <Container
          maxWidth={false}
          sx={{
            py: 3,
            flexGrow: 1,
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}
