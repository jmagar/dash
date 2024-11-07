import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  Theme,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import { useAsync, useKeyPress, useLocalStorage } from '../hooks';
import { Host } from '../types';
import HostSelector from './HostSelector';
import LoadingScreen from './LoadingScreen';
import 'xterm/css/xterm.css';

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const DEFAULT_FONT_SIZE = 14;

const Terminal: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();
  const socketRef = useRef<Socket>();
  const fitAddonRef = useRef(new FitAddon());
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostSelectorOpen, setHostSelectorOpen] = useState(false);
  const [fontSize, setFontSize] = useLocalStorage('terminal.fontSize', DEFAULT_FONT_SIZE);

  const {
    loading,
    error,
    execute: connectToHost,
  } = useAsync<void>(
    async () => {
      if (!selectedHost || !terminalRef.current) return;

      // Initialize xterm
      const term = new XTerm({
        fontSize,
        fontFamily: 'monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
      });

      // Add addons
      term.loadAddon(fitAddonRef.current);
      term.loadAddon(new WebLinksAddon());

      // Clear previous terminal if it exists
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }

      // Open terminal
      term.open(terminalRef.current);
      xtermRef.current = term;
      fitAddonRef.current.fit();

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
        fitAddonRef.current.fit();
        const { rows, cols } = term;
        socketRef.current?.emit('resize', { rows, cols });
      };

      window.addEventListener('resize', handleResize);

      // Return cleanup function
      return (): void => {
        window.removeEventListener('resize', handleResize);
        socketRef.current?.disconnect();
        term.dispose();
      };
    },
    {
      deps: [selectedHost?.id, fontSize],
    }
  );

  const handleHostSelect = (hosts: Host[]): void => {
    setSelectedHost(hosts[0]);
    setHostSelectorOpen(false);
  };

  const handleFontSizeChange = (delta: number): void => {
    setFontSize((prev) => {
      const newSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, prev + delta));
      if (xtermRef.current) {
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

  useEffect(() => {
    if (selectedHost) {
      void connectToHost();
    }
  }, [selectedHost, connectToHost]);

  if (!selectedHost) {
    return (
      <Box sx={{ p: 3 }}>
        <Button variant="contained" onClick={() => setHostSelectorOpen(true)}>
          Select Host
        </Button>
        <HostSelector
          open={hostSelectorOpen}
          onClose={() => setHostSelectorOpen(false)}
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
        <Button variant="contained" onClick={() => void connectToHost()}>
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
          onClick={() => handleFontSizeChange(-1)}
          disabled={fontSize <= MIN_FONT_SIZE}
          title="Decrease font size (Ctrl+-)"
        >
          <ZoomOutIcon />
        </IconButton>
        <Typography variant="body2">{fontSize}px</Typography>
        <IconButton
          onClick={() => handleFontSizeChange(1)}
          disabled={fontSize >= MAX_FONT_SIZE}
          title="Increase font size (Ctrl++)"
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton onClick={() => setHostSelectorOpen(true)}>
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
