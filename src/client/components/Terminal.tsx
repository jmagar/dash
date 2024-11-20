import React, { useEffect, useRef } from 'react';

import { Terminal as XTerm } from '@xterm/xterm';

import { Box, useTheme } from '@mui/material';

// Import addons from their index files
import { useSocket } from '../hooks/useSocket';
import { logger } from '../utils/frontendLogger';

import type { FitAddon } from '@xterm/addon-fit';

// Dynamic imports for the addons
const importFitAddon = () => import('@xterm/addon-fit').then(m => m.FitAddon);
const importWebLinksAddon = () => import('@xterm/addon-web-links').then(m => m.WebLinksAddon);
const importSearchAddon = () => import('@xterm/addon-search').then(m => m.SearchAddon);

import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  hostId: string;
  sessionId: string;
  onResize?: (cols: number, rows: number) => void;
  onData?: (data: string) => void;
  onExit?: (code: number) => void;
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
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: theme.palette.background.paper,
        foreground: theme.palette.text.primary,
        cursor: theme.palette.text.primary,
        cursorAccent: theme.palette.text.secondary,
        selectionBackground: theme.palette.action.selected,
      },
    });

    // Initialize addons
    void Promise.all([
      importFitAddon(),
      importWebLinksAddon(),
      importSearchAddon()
    ]).then(([FitAddon, WebLinksAddon, SearchAddon]) => {
      if (!socket || !terminalRef.current) return;

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.loadAddon(new WebLinksAddon());
      xterm.loadAddon(new SearchAddon());

      xterm.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      const { cols, rows } = xterm;
      socket.emit('terminal:join', {
        hostId,
        sessionId,
        command: `${cols}x${rows}` // Default command based on terminal size
      });

      const handleResize = () => {
        if (!socket) return;

        fitAddon.fit();
        const { cols, rows } = xterm;
        socket.emit('terminal:resize', { hostId, sessionId, cols, rows });
        onResize?.(cols, rows);
      };

      resizeHandlerRef.current = handleResize;
      window.addEventListener('resize', handleResize);
    }).catch(error => {
      logger.error('Failed to initialize terminal addons', { error });
    });

    const handleData = (data: string) => {
      if (!socket) return;
      socket.emit('terminal:data', { hostId, sessionId, data });
      onData?.(data);
    };

    const handleTerminalData = (data: { hostId: string; sessionId: string; data: string }) => {
      if (data.hostId === hostId && data.sessionId === sessionId) {
        xterm.write(data.data);
      }
    };

    const handleExit = (data: { hostId: string; sessionId: string; code: number }) => {
      if (data.hostId === hostId && data.sessionId === sessionId) {
        logger.info('Terminal session ended', { hostId, sessionId, code: data.code });
        onExit?.(data.code);
      }
    };

    xterm.onData(handleData);
    socket.on('terminal:data', handleTerminalData);
    socket.on('terminal:exit', handleExit);

    return () => {
      if (socket) {
        socket.off('terminal:data', handleTerminalData);
        socket.off('terminal:exit', handleExit);
        socket.emit('terminal:leave', { hostId, sessionId });
      }

      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }

      xterm.dispose();
    };
  }, [hostId, sessionId, socket, theme, onResize, onData, onExit]);

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
