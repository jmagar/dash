import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
} from '@mui/material';
import type { FitAddon } from '@xterm/addon-fit';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Terminal as XTerm } from 'xterm';

import { useAsync, useKeyPress, useLocalStorage } from '../hooks';
import { Host } from '../types';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';

import 'xterm/css/xterm.css';

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const DEFAULT_FONT_SIZE = 14;

interface TerminalProps {
  host?: Host;
}

const Terminal: React.FC<TerminalProps> = ({ host: initialHost }): JSX.Element => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();
  const socketRef = useRef<Socket>();
  const fitAddonRef = useRef<FitAddon>();
  const [selectedHost, setSelectedHost] = useState<Host | null>(initialHost || null);
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const [fontSize, setFontSize] = useLocalStorage('terminal.fontSize', DEFAULT_FONT_SIZE);

  const setupTerminal = useCallback(async (): Promise<() => void> => {
    if (!selectedHost || !terminalRef.current) {
      throw new Error('Host or terminal element not available');
    }

    // Initialize xterm
    const term = new XTerm({
      fontSize,
      fontFamily: 'monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    // Load addons dynamically
    const [{ FitAddon }, { WebLinksAddon }] = await Promise.all([
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ]);

    // Initialize addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    fitAddonRef.current = fitAddon;

    // Add addons
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Clear previous terminal if it exists
    if (xtermRef.current) {
      xtermRef.current.dispose();
    }

    // Open terminal
    term.open(terminalRef.current);
    xtermRef.current = term;
    fitAddon.fit();

    // Connect to WebSocket
    socketRef.current = io(`${process.env.REACT_APP_WS_URL}/terminal`, {
      query: { hostId: selectedHost.id },
    });

    // Handle terminal data
    term.onData((data) => {
      socketRef.current?.emit('data', data);
    });

    // Handle socket events
    socketRef.current.on('data', (data: string) => {
      term.write(data);
    });

    socketRef.current.on('error', (err: string) => {
      term.writeln(`\r\nError: ${err}\r\n`);
    });

    // Handle resize
    const handleResize = (): void => {
      fitAddon.fit();
      const { rows, cols } = term;
      socketRef.current?.emit('resize', { rows, cols });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    const cleanup = (): void => {
      window.removeEventListener('resize', handleResize);
      socketRef.current?.disconnect();
      term.dispose();
      fitAddon.dispose();
      webLinksAddon.dispose();
    };

    return cleanup;
  }, [selectedHost, fontSize]);

  const {
    loading,
    error,
    execute: connectToTerminal,
  } = useAsync<void>(
    async () => {
      const cleanup = await setupTerminal();
      return cleanup();
    },
    {
      deps: [setupTerminal],
    },
  );

  useEffect(() => {
    if (selectedHost) {
      void connectToTerminal();
    }
  }, [selectedHost, connectToTerminal]);

  const handleHostSelect = (hosts: Host[]): void => {
    if (hosts && hosts.length > 0) {
      setSelectedHost(hosts[0]);
      setHostSelectorOpen(false);
    }
  };

  const handleFontSizeChange = (delta: number): void => {
    setFontSize((prev) => {
      const newSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, prev + delta));
      if (xtermRef.current && fitAddonRef.current) {
        xtermRef.current.options.fontSize = newSize;
        fitAddonRef.current.fit();
      }
      return newSize;
    });
  };

  useKeyPress('+', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      handleFontSizeChange(1);
    }
  });

  useKeyPress('-', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      handleFontSizeChange(-1);
    }
  });

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={(): void => setHostSelectorOpen(true)}>
          Select Host
        </Button>
        <HostSelector
          open={hostSelectorOpen}
          onClose={(): void => setHostSelectorOpen(false)}
          onSelect={handleHostSelect}
          multiSelect={false}
        />
      </Box>
    );
  }

  if (loading) {
    return <LoadingScreen fullscreen={false} message="Connecting to terminal..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={(): void => void connectToTerminal()}>
          Retry Connection
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">Terminal</Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {selectedHost.name} - {selectedHost.hostname}:{selectedHost.port}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          onClick={(): void => handleFontSizeChange(-1)}
          disabled={fontSize <= MIN_FONT_SIZE}
          title="Decrease font size (Ctrl+-)"
        >
          <ZoomOutIcon />
        </IconButton>
        <Typography variant="body2">{fontSize}px</Typography>
        <IconButton
          onClick={(): void => handleFontSizeChange(1)}
          disabled={fontSize >= MAX_FONT_SIZE}
          title="Increase font size (Ctrl++)"
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton onClick={(): void => setHostSelectorOpen(true)}>
          <SettingsIcon />
        </IconButton>
      </Box>

      <Paper
        sx={{
          flexGrow: 1,
          overflow: 'hidden',
          bgcolor: '#1e1e1e',
          '& .xterm': {
            height: '100%',
          },
        }}
      >
        <div ref={terminalRef} style={{ height: '100%' }} />
      </Paper>
    </Box>
  );
};

export default Terminal;
