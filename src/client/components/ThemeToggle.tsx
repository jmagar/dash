import React from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  LightMode,
  DarkMode,
  SettingsBrightness,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useTheme } from '../providers/ThemeProvider';
import { materialAccentColors, AccentColor } from '../styles/theme';

export const ThemeToggle: React.FC = () => {
  const { mode, setMode, accentColor, setAccentColor } = useTheme();
  const muiTheme = useMuiTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode);
    handleClose();
  };

  const handleAccentChange = (newColor: AccentColor) => {
    setAccentColor(newColor);
    handleClose();
  };

  const getCurrentIcon = () => {
    switch (mode) {
      case 'light':
        return <LightMode />;
      case 'dark':
        return <DarkMode />;
      default:
        return <SettingsBrightness />;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        color="inherit"
        aria-label="toggle theme"
        sx={{ ml: 1 }}
      >
        {getCurrentIcon()}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleModeChange('system')}>
          <ListItemIcon>
            <SettingsBrightness />
          </ListItemIcon>
          <ListItemText primary="System" />
        </MenuItem>
        <MenuItem onClick={() => handleModeChange('light')}>
          <ListItemIcon>
            <LightMode />
          </ListItemIcon>
          <ListItemText primary="Light" />
        </MenuItem>
        <MenuItem onClick={() => handleModeChange('dark')}>
          <ListItemIcon>
            <DarkMode />
          </ListItemIcon>
          <ListItemText primary="Dark" />
        </MenuItem>
        
        <Divider />
        
        {(Object.keys(materialAccentColors) as AccentColor[]).map((color) => (
          <MenuItem
            key={color}
            onClick={() => handleAccentChange(color)}
            selected={color === accentColor}
          >
            <ListItemIcon>
              <CircleIcon sx={{ color: materialAccentColors[color].main }} />
            </ListItemIcon>
            <ListItemText
              primary={color.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
