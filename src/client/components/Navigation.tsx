import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Tooltip,
  Divider,
  useTheme,
  alpha,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Terminal as TerminalIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  Computer as ComputerIcon,
  Dns as DnsIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme as useAppTheme } from '../hooks/useTheme';
import { NotificationBell } from './NotificationBell';

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  subItems?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
  },
  {
    label: 'Terminal',
    path: '/terminal',
    icon: <TerminalIcon />,
  },
  {
    label: 'Hosts',
    path: '/hosts',
    icon: <ComputerIcon />,
    subItems: [
      {
        label: 'Manager',
        path: '/hosts/manager',
        icon: <DnsIcon />,
      },
      {
        label: 'Processes',
        path: '/hosts/processes',
        icon: <MemoryIcon />,
      },
      {
        label: 'Performance',
        path: '/hosts/performance',
        icon: <SpeedIcon />,
      },
      {
        label: 'Network',
        path: '/hosts/network',
        icon: <NetworkIcon />,
      },
    ],
  },
  {
    label: 'Storage',
    path: '/storage',
    icon: <StorageIcon />,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
    subItems: [
      {
        label: 'Notifications',
        path: '/settings/notifications',
        icon: <NotificationsIcon />,
      },
      {
        label: 'Security',
        path: '/settings/security',
        icon: <SecurityIcon />,
      },
    ],
  },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { theme: appTheme, toggleTheme } = useAppTheme();
  const { user, logout } = useAuth();
  const [openItems, setOpenItems] = React.useState<{ [key: string]: boolean }>({});

  const handleItemClick = (path: string) => {
    navigate(path);
  };

  const handleSubMenuToggle = (label: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const isSelected = location.pathname === item.path;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isOpen = openItems[item.label] || false;

    return (
      <React.Fragment key={item.path}>
        <ListItem
          disablePadding
          sx={{
            display: 'block',
            pl: depth * 2,
          }}
        >
          <ListItemButton
            selected={isSelected}
            onClick={() => {
              if (hasSubItems) {
                handleSubMenuToggle(item.label);
              } else {
                handleItemClick(item.path);
              }
            }}
            sx={{
              minHeight: 48,
              px: 2.5,
              borderRadius: '8px',
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, appTheme === 'dark' ? 0.2 : 0.1),
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, appTheme === 'dark' ? 0.3 : 0.2),
                },
              },
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, appTheme === 'dark' ? 0.1 : 0.05),
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 3,
                justifyContent: 'center',
                color: isSelected ? 'primary.main' : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'primary.main' : 'text.primary',
                  }}
                >
                  {item.label}
                </Typography>
              }
            />
            {hasSubItems && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubMenuToggle(item.label);
                }}
                sx={{
                  transform: isOpen ? 'rotate(-180deg)' : 'rotate(0)',
                  transition: theme.transitions.create('transform', {
                    duration: theme.transitions.duration.shorter,
                  }),
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </ListItemButton>
        </ListItem>
        {hasSubItems && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems!.map((subItem) =>
                renderNavigationItem(subItem, depth + 1)
              )}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        pt: 8,
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <DnsIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h6" fontWeight="bold">
          SSH Manager
        </Typography>
      </Box>

      <Divider />

      <List
        sx={{
          width: '100%',
          p: 1,
        }}
      >
        {navigationItems.map((item) => renderNavigationItem(item))}
      </List>

      <Divider />

      <List sx={{ px: 2, py: 1 }}>
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              borderRadius: 1,
              minHeight: 48,
              px: 2.5,
              py: 1,
            }}
          >
            <ListItemIcon>
              <BugReportIcon />
            </ListItemIcon>
            <ListItemText
              primary="Report Issue"
              primaryTypographyProps={{
                variant: 'body2',
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              borderRadius: 1,
              minHeight: 48,
              px: 2.5,
              py: 1,
            }}
          >
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText
              primary="Help & Support"
              primaryTypographyProps={{
                variant: 'body2',
              }}
            />
          </ListItemButton>
        </ListItem>
        {user && (
          <ListItem disablePadding>
            <ListItemButton
              sx={{
                borderRadius: 1,
                minHeight: 48,
                px: 2.5,
                py: 1,
              }}
            >
              <ListItemIcon>
                <NotificationBell userId={user.id} />
              </ListItemIcon>
              <ListItemText
                primary="Notifications"
                primaryTypographyProps={{
                  variant: 'body2',
                }}
              />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              borderRadius: 1,
              minHeight: 48,
              px: 2.5,
              py: 1,
            }}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText
              primary="Settings"
              primaryTypographyProps={{
                variant: 'body2',
              }}
            />
            <IconButton
              edge="end"
              size="small"
              onClick={toggleTheme}
              sx={{
                transform: 'none',
                transition: 'transform 0.3s',
              }}
            >
              {appTheme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={logout}
            sx={{
              borderRadius: 1,
              minHeight: 48,
              px: 2.5,
              py: 1,
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{
                variant: 'body2',
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );
}
