import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import PaletteIcon from '@mui/icons-material/Palette';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  styled,
} from '@mui/material';
import React, { useState } from 'react';

import { ACCENT_COLORS, useTheme } from '../context/ThemeContext';

const ColorDot = styled('span')<{ color: string }>(({ color }) => ({
  display: 'inline-block',
  width: 20,
  height: 20,
  borderRadius: '50%',
  backgroundColor: color,
  marginRight: 8,
  border: '2px solid white',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
}));

export default function ThemeControls(): JSX.Element {
  const { isDarkMode, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [colorMenuAnchor, setColorMenuAnchor] = useState<null | HTMLElement>(null);

  const handleColorClick = (event: React.MouseEvent<HTMLElement>): void => {
    setColorMenuAnchor(event.currentTarget);
  };

  const handleColorClose = (): void => {
    setColorMenuAnchor(null);
  };

  const handleColorSelect = (color: string): void => {
    setAccentColor(color);
    handleColorClose();
  };

  const renderMenuItem = (name: string, color: string): JSX.Element => (
    <MenuItem
      key={name}
      onClick={() => handleColorSelect(color)}
      selected={color === accentColor}
    >
      <ColorDot color={color} />
      {name.charAt(0).toUpperCase() + name.slice(1)}
    </MenuItem>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title="Toggle color theme">
        <IconButton
          onClick={toggleTheme}
          color="inherit"
          sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
        >
          {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Tooltip>

      <Tooltip title="Change accent color">
        <IconButton
          onClick={handleColorClick}
          color="inherit"
          sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={colorMenuAnchor}
        open={Boolean(colorMenuAnchor)}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {Object.entries(ACCENT_COLORS).map(([name, color]) =>
          renderMenuItem(name, color),
        )}
      </Menu>
    </Box>
  );
}
