import React, { useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';
import { Terminal as XTerm } from '@xterm/xterm';
// Import addons from their index files
import type { FitAddon } from '@xterm/addon-fit';
import type { WebLinksAddon } from '@xterm/addon-web-links';
import type { SearchAddon } from '@xterm/addon-search';
import { useSocket } from '../hooks/useSocket';
import { logger } from '../utils/frontendLogger';
import type { TerminalData, TerminalExit } from '@/types/terminal';

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
        cursorAccent: theme.palette.text.secondary,
        selectionBackground: theme.palette.action.selected,
      },
    });

    // Initialize addons
    Promise.all([
      importFitAddon(),
      importWebLinksAddon(),
      importSearchAddon()
    ]).then(([FitAddon, WebLinksAddon, SearchAddon]) => {
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const searchAddon = new SearchAddon();

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(webLinksAddon);
      xterm.loadAddon(searchAddon);

      xterm.open(terminalRef.current!);
      fitAddon.fit();

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      socket.emit('terminal:join', { hostId, sessionId });

      const handleResize = () => {
        fitAddon.fit();
        const { cols, rows } = xterm;
        socket.emit('terminal:resize', { hostId, sessionId, cols, rows });
        onResize?.(cols, rows);
      };

      resizeHandlerRef.current = handleResize;
      window.addEventListener('resize', handleResize);
    });

    const handleData = (data: string) => {
      socket.emit('terminal:data', { hostId, sessionId, data });
      onData?.(data);
    };

    const handleTerminalData = (...args: unknown[]) => {
      const [data] = args;
      const terminalData = data as { hostId: string; sessionId: string; data: string };
      if (terminalData.hostId === hostId && terminalData.sessionId === sessionId) {
        xterm.write(terminalData.data);
      }
    };

    const handleExit = (...args: unknown[]) => {
      const [data] = args;
      const exitData = data as { hostId: string; sessionId: string; code: number };
      if (exitData.hostId === hostId && exitData.sessionId === sessionId) {
        logger.info('Terminal session ended', { hostId, sessionId, code: exitData.code });
        onExit?.(exitData.code);
      }
    };

    xterm.onData(handleData);
    socket.on('terminal:data', handleTerminalData);
    socket.on('terminal:exit', handleExit);

    return () => {
      socket.off('terminal:data', handleTerminalData);
      socket.off('terminal:exit', handleExit);
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
      socket.emit('terminal:leave', { hostId, sessionId });
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
