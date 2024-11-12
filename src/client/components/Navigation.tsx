import CodeIcon from '@mui/icons-material/Code';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import PackageIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorageIcon from '@mui/icons-material/Storage';
import TerminalIcon from '@mui/icons-material/Terminal';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import HostSelector from './HostSelector';
import { useHost } from '../context/HostContext';

const menuItems = [
  { icon: DashboardIcon, text: 'Dashboard', path: '/', shortcut: 'Alt+D' },
  { icon: FolderIcon, text: 'Files', path: '/files', shortcut: 'Alt+F' },
  { icon: PackageIcon, text: 'Packages', path: '/packages', shortcut: 'Alt+P' },
  { icon: TerminalIcon, text: 'Terminal', path: '/terminal', shortcut: 'Alt+T' },
  { icon: CodeIcon, text: 'Execute', path: '/execute', shortcut: 'Alt+E' },
  { icon: LocalShippingIcon, text: 'Docker', path: '/docker', shortcut: 'Alt+K' },
  { icon: StorageIcon, text: 'Storage', path: '/storage', shortcut: 'Alt+S' },
];

export default function Navigation(): JSX.Element {
  const location = useLocation();
  const { selectedHost } = useHost();

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ p: 2 }}>
        <HostSelector />
      </Box>

      <Divider />

      <List sx={{ pt: 0 }}>
        {menuItems.map(({ icon: Icon, text, path, shortcut }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              component={Link}
              to={path}
              selected={location.pathname === path}
              disabled={!selectedHost && path !== '/'}
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'inherit',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon />
              </ListItemIcon>
              <ListItemText
                primary={text}
                secondary={
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.7,
                      display: { xs: 'none', sm: 'block' },
                    }}
                  >
                    {shortcut}
                  </Typography>
                }
                secondaryTypographyProps={{
                  sx: {
                    color: 'inherit',
                    opacity: location.pathname === path ? 0.9 : 0.7,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
