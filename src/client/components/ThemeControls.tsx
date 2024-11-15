import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import {
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import React from 'react';

import { useTheme } from '../context/ThemeContext';

export default function ThemeControls(): JSX.Element {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

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
    </Box>
  );
}
