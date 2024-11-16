import React, { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import { useSocket } from '../hooks/useSocket';
import { logger } from '../utils/frontendLogger';

import 'xterm/css/xterm.css';

interface TerminalProps {
  hostId: string;
  sessionId: string;
  onResize?: (cols: number, rows: number) => void;
  onData?: (data: string) => void;
  onExit?: () => void;
}

export function Terminal({
  hostId,
  sessionId,
  onResize,
  onData,
  onExit,
}: TerminalProps): JSX.Element {
  const theme = useTheme();
  const socket = useSocket();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.text.primary,
        selection: theme.palette.action.selected,
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);
    xterm.loadAddon(searchAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    socket.emit('terminal:join', { hostId, sessionId });

    const handleData = (data: string) => {
      socket.emit('terminal:data', { hostId, sessionId, data });
      onData?.(data);
    };

    const handleResize = ({ cols, rows }: { cols: number; rows: number }) => {
      socket.emit('terminal:resize', { hostId, sessionId, cols, rows });
      onResize?.(cols, rows);
    };

    xterm.onData(handleData);
    xterm.onResize(handleResize);

    socket.on('terminal:data', (data: string) => {
      xterm.write(data);
    });

    socket.on('terminal:exit', () => {
      logger.info('Terminal session ended:', { hostId, sessionId });
      onExit?.();
    });

    const handleWindowResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      socket.emit('terminal:leave', { hostId, sessionId });
      socket.off('terminal:data');
      socket.off('terminal:exit');
      window.removeEventListener('resize', handleWindowResize);
      xterm.dispose();
    };
  }, [hostId, sessionId, socket, theme, onData, onResize, onExit]);

  return (
    <Box
      ref={terminalRef}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        borderRadius: 1,
        '& .xterm': {
          padding: 1,
        },
      }}
    />
  );
}
