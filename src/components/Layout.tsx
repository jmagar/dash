import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Folder as FileIcon,
  Code as CodeIcon,
  Build as PackageIcon,
  ViewInAr as ComposeIcon,
  Cloud as DockerIcon,
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
  Divider,
} from '@mui/material';
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { logout } from '../api/auth';
import { useUserContext } from '../context/UserContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { user, setUser } = useUserContext();

  // Toggle drawer open/closed
  const _toggleDrawer = useCallback((): void => {
    setDrawerOpen((prevOpen: boolean): boolean => !prevOpen);
  }, []);

  const handleNavigation = (path: string): void => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={_toggleDrawer}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            SSH Remote Management
          </Typography>
          {user && (
            <Typography variant="subtitle1" noWrap>
              {user.username}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            top: 64,
          },
        }}
      >
        <List>
          <ListItem button onClick={(): void => handleNavigation('/')}>
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>

          <Divider />

          {/* Docker Management */}
          <ListItem button onClick={(): void => handleNavigation('/docker')}>
            <ListItemIcon>
              <DockerIcon />
            </ListItemIcon>
            <ListItemText primary="Docker" />
          </ListItem>
          <ListItem button onClick={(): void => handleNavigation('/containers')}>
            <ListItemIcon>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="Containers" />
          </ListItem>
          <ListItem button onClick={(): void => handleNavigation('/compose')}>
            <ListItemIcon>
              <ComposeIcon />
            </ListItemIcon>
            <ListItemText primary="Compose" />
          </ListItem>

          <Divider />

          {/* System Management */}
          <ListItem button onClick={(): void => handleNavigation('/files')}>
            <ListItemIcon>
              <FileIcon />
            </ListItemIcon>
            <ListItemText primary="File Explorer" />
          </ListItem>
          <ListItem button onClick={(): void => handleNavigation('/packages')}>
            <ListItemIcon>
              <PackageIcon />
            </ListItemIcon>
            <ListItemText primary="Package Manager" />
          </ListItem>
          <ListItem button onClick={(): void => handleNavigation('/remote-execution')}>
            <ListItemIcon>
              <CodeIcon />
            </ListItemIcon>
            <ListItemText primary="Remote Execution" />
          </ListItem>

          <Divider />

          {/* User */}
          <ListItem button onClick={(): void => handleNavigation('/profile')}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItem>
          <ListItem button onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerOpen ? 240 : 0}px)` },
          ml: { sm: `${drawerOpen ? 240 : 0}px` },
          mt: ['64px', '64px'],
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
