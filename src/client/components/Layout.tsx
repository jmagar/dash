import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  InputBase,
  Toolbar,
  Typography,
  alpha,
  styled,
  ThemeProvider,
  useTheme,
} from '@mui/material';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Navigation } from './Navigation';
import ThemeControls from './ThemeControls';
import { FloatingChatButton } from './FloatingChatButton';
import { NotificationBell } from './NotificationBell';
import { ErrorBoundary } from './ErrorBoundary';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '40ch',
    },
  },
}));

export default function Layout({ children }: LayoutProps): JSX.Element {
  const location = useLocation();
  const theme = useTheme();
  const { user } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <Typography
              variant="h6"
              noWrap
              component={Link}
              to="/"
              replace
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                flexGrow: 0,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              SSH Remote Management
            </Typography>

            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search hosts, containers, files, logs..."
                inputProps={{ 'aria-label': 'search' }}
              />
            </Search>

            <Box sx={{ flexGrow: 1 }} />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <ThemeControls />

              <IconButton
                color="inherit"
                component={Link}
                to="/settings"
                replace
                size="large"
                sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                <SettingsIcon />
              </IconButton>
              <IconButton
                color="inherit"
                component={Link}
                to="/profile"
                replace
                size="large"
                sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                <AccountCircleIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar />
          <Navigation />
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 },
            mt: '64px', // Height of AppBar
            position: 'relative',
            zIndex: 1,
            bgcolor: 'background.default',
            borderRadius: '16px 16px 0 0',
            boxShadow: theme.shadows[1],
          }}
        >
          <Container maxWidth="xl">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </Container>
        </Box>
        {user && (
          <>
            <FloatingChatButton />
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
