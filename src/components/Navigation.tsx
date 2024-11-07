import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  Terminal as TerminalIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Folder as FolderIcon,
  Archive as PackageIcon,
  ViewInAr as DockerIcon,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  Theme,
} from '@mui/material';
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useLocalStorage } from '../hooks';

const DRAWER_WIDTH = 240;

interface NavigationItem {
  text: string;
  path: string;
  icon: React.ReactNode;
  shortcut?: string;
  requiredRole?: 'admin' | 'user' | 'viewer';
}

const navigationItems: NavigationItem[] = [
  { text: 'Dashboard', path: '/', icon: <DashboardIcon />, shortcut: 'd' },
  { text: 'Files', path: '/files', icon: <FolderIcon />, shortcut: 'f' },
  { text: 'Packages', path: '/packages', icon: <PackageIcon />, shortcut: 'p', requiredRole: 'user' },
  { text: 'Terminal', path: '/terminal', icon: <TerminalIcon />, shortcut: 't', requiredRole: 'user' },
  { text: 'Execute', path: '/execute', icon: <CodeIcon />, shortcut: 'e', requiredRole: 'user' },
  { text: 'Docker', path: '/docker', icon: <DockerIcon />, shortcut: 'k', requiredRole: 'user' },
  { text: 'Storage', path: '/storage', icon: <StorageIcon />, shortcut: 's', requiredRole: 'user' },
  { text: 'Settings', path: '/settings', icon: <SettingsIcon />, requiredRole: 'admin' },
  { text: 'Profile', path: '/profile', icon: <PersonIcon /> },
];

const Navigation: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useLocalStorage('navigation.drawerOpen', true);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (!e.altKey) return;

      // Handle drawer toggle
      if (e.key === 'm') {
        e.preventDefault();
        setDrawerOpen((prev) => !prev);
        return;
      }

      // Handle navigation shortcuts
      const item = navigationItems.find(
        (item) => item.shortcut && item.shortcut.toLowerCase() === e.key.toLowerCase(),
      );
      if (item) {
        e.preventDefault();
        window.location.href = item.path;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setDrawerOpen]);

  const handleDrawerToggle = (): void => {
    setDrawerOpen((prev) => !prev);
  };

  const drawer = (
    <Box>
      <Toolbar />
      <List>
        {navigationItems.map((item) => (
          <ListItem
            key={item.path}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              color: 'inherit',
              textDecoration: 'none',
              '&.Mui-selected': {
                backgroundColor: (theme: Theme) => theme.palette.action.selected,
              },
              '&:hover': {
                backgroundColor: (theme: Theme) => theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.text}
              secondary={item.shortcut ? `Alt+${item.shortcut.toUpperCase()}` : undefined}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          width: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          ml: drawerOpen ? `${DRAWER_WIDTH}px` : 0,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
            title="Toggle navigation (Alt+M)"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            SSH Remote Management
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        open={drawerOpen}
        sx={{
          width: drawerOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            transition: theme.transitions.create('transform', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            transform: drawerOpen ? 'none' : `translateX(-${DRAWER_WIDTH}px)`,
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navigation;
