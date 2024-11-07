import BuildIcon from '@mui/icons-material/Build';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ImageIcon from '@mui/icons-material/Image';
import MenuIcon from '@mui/icons-material/Menu';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import StorageIcon from '@mui/icons-material/Storage';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Box } from '@mui/material';
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import SSHConnectionManager from './SSHConnectionManager';

// Define the props for the Layout component
interface LayoutProps {
  children: React.ReactNode;
}

// Define the structure for navigation items
interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

// Array of navigation items
const navItems: NavItem[] = [
  { text: 'Containers', icon: <DashboardIcon />, path: '/' },
  { text: 'Images', icon: <ImageIcon />, path: '/images' },
  { text: 'Volumes', icon: <StorageIcon />, path: '/volumes' },
  { text: 'Networks', icon: <NetworkCheckIcon />, path: '/networks' },
  { text: 'Compose', icon: <BuildIcon />, path: '/compose' },
];

export default function Layout({ children }: LayoutProps) {
  // State to control the open/closed state of the drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Toggle drawer open/closed
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Docker Management UI
          </Typography>
          <SSHConnectionManager />
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navItems.map((item) => (
              <ListItem button key={item.text} component={RouterLink} to={item.path}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={toggleDrawer}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navItems.map((item) => (
              <ListItem button key={item.text} component={RouterLink} to={item.path} onClick={toggleDrawer}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}