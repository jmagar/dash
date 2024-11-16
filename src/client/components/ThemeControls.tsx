import React from 'react';
import {
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Fade,
  Box,
  Typography,
  Divider,
  alpha,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  BrightnessAuto as SystemModeIcon,
  Check as CheckIcon,
  Palette as PaletteIcon,
  ColorLens as ColorLensIcon,
} from '@mui/icons-material';
import { useThemeMode } from '../hooks/useThemeMode';

export function ThemeControls(): JSX.Element {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    handleClose();
  };

  const getThemeIcon = () => {
    switch (mode) {
      case 'light':
        return <LightModeIcon />;
      case 'dark':
        return <DarkModeIcon />;
      default:
        return <SystemModeIcon />;
    }
  };

  const menuItems = [
    { value: 'light', label: 'Light Mode', icon: <LightModeIcon /> },
    { value: 'dark', label: 'Dark Mode', icon: <DarkModeIcon /> },
    { value: 'system', label: 'System Mode', icon: <SystemModeIcon /> },
  ];

  return (
    <>
      <Tooltip
        title="Theme settings"
        TransitionComponent={Fade}
        arrow
      >
        <IconButton
          onClick={handleClick}
          color="inherit"
          size="large"
          sx={{
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'rotate(30deg)',
            },
          }}
        >
          {getThemeIcon()}
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        TransitionComponent={Fade}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 220,
            borderRadius: 2,
            mt: 1,
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <PaletteIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="medium">
              Theme Settings
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Choose your preferred theme mode
          </Typography>
        </Box>

        <Divider />

        {menuItems.map((item) => (
          <MenuItem
            key={item.value}
            onClick={() => handleModeChange(item.value as 'light' | 'dark' | 'system')}
            selected={mode === item.value}
            sx={{
              py: 1.5,
              px: 2,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.16),
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: mode === item.value ? 'primary.main' : 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: mode === item.value ? 'bold' : 'normal',
              }}
            />
            {mode === item.value && (
              <CheckIcon
                fontSize="small"
                sx={{
                  ml: 1,
                  color: 'primary.main',
                }}
              />
            )}
          </MenuItem>
        ))}

        <Box sx={{ p: 2, pt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            Current theme: {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Typography>
        </Box>
      </Menu>
    </>
  );
}
