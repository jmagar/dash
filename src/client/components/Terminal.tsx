import React, { useEffect, useRef } from 'react';
import { Box, Paper, useTheme } from '@mui/material';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';

import type { Host } from '../../types';

interface Props {
  host: Host;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  className?: string;
}

export default function Terminal({ host, onData, onResize, className = '' }: Props): JSX.Element {
  const theme = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();

  useEffect(() => {
    if (!terminalRef.current) return;

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon();

    const xterm = new XTerm({
      fontFamily: '"Cascadia Code", Menlo, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: {
        background: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.background.default,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.primary.main,
        selection: theme.palette.action.selected,
        black: theme.palette.mode === 'dark' ? '#000000' : '#2e3436',
        red: theme.palette.error.main,
        green: theme.palette.success.main,
        yellow: theme.palette.warning.main,
        blue: theme.palette.primary.main,
        magenta: theme.palette.secondary.main,
        cyan: '#2aa198',
        white: theme.palette.mode === 'dark' ? '#eee8d5' : '#d3d7cf',
        brightBlack: '#002b36',
        brightRed: theme.palette.error.light,
        brightGreen: theme.palette.success.light,
        brightYellow: theme.palette.warning.light,
        brightBlue: theme.palette.primary.light,
        brightMagenta: theme.palette.secondary.light,
        brightCyan: '#93a1a1',
        brightWhite: '#fdf6e3',
      },
    });

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(searchAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xterm.onData((data) => {
      onData?.(data);
    });

    xterm.onResize(({ cols, rows }) => {
      onResize?.(cols, rows);
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);
    xtermRef.current = xterm;

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [onData, onResize, theme]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    term.write(`Connected to ${host.name} (${host.hostname}:${host.port})\r\n`);
  }, [host]);

  return (
    <Paper
      elevation={3}
      sx={{
        height: '100%',
        overflow: 'hidden',
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        '& .xterm': {
          height: '100%',
          padding: 1,
        },
        '& .xterm-viewport': {
          '&::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.background.default,
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.action.active,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: theme.palette.action.hover,
          },
        },
      }}
      className={className}
    >
      <Box ref={terminalRef} sx={{ height: '100%' }} />
    </Paper>
  );
}
