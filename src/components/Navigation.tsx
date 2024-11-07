import React, { useState } from 'react';
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
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { useKeyPress, useLocalStorage } from '../hooks';

const DRAWER_WIDTH = 240;

interface NavigationItem {
  text: string;
  path: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const navigationItems: NavigationItem[] = [
  { text: 'Dashboard', path: '/', icon: <DashboardIcon />, shortcut: 'd' },
  { text: 'Files', path: '/files', icon: <FolderIcon />, shortcut: 'f' },
  { text: 'Packages', path: '/packages', icon: <PackageIcon />, shortcut: 'p' },
  { text: 'Terminal', path: '/terminal', icon: <TerminalIcon />, shortcut: 't' },
  { text: 'Execute', path: '/execute', icon: <CodeIcon />, shortcut: 'e' },
  { text: 'Storage', path: '/storage', icon: <StorageIcon />, shortcut: 's' },
  { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  { text: 'Profile', path: '/profile', icon: <PersonIcon /> },
];

const Navigation: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useLocalStorage('navigation.drawerOpen', true);

  // Add keyboard shortcuts for navigation
  navigationItems.forEach((item) => {
    if (item.shortcut) {
      useKeyPress(item.shortcut, (e) => {
        if (e.altKey) {
          e.preventDefault();
          window.location.href = item.path;
        }
      });
    }
  });

  // Toggle drawer with Alt+M
  useKeyPress('m', (e) => {
    if (e.altKey) {
      e.preventDefault();
      setDrawerOpen((prev) => !prev);
    }
  });

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
            onClick={() => setDrawerOpen((prev) => !prev)}
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
