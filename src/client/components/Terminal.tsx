import { Box } from '@mui/material';
import { Terminal as XTerm } from '@xterm/xterm';
import React, { useEffect, useRef } from 'react';

import type { Host } from '../../types';
import '@xterm/xterm/css/xterm.css';

interface Props {
  host: Host;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export default function Terminal({ host, onData, onResize }: Props): JSX.Element {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm>();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const loadAddons = async (): Promise<void> => {
      const [{ FitAddon }, { WebLinksAddon }] = await Promise.all([
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ]);

      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
        },
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(terminalRef.current as HTMLElement);
      fitAddon.fit();

      term.onData((data) => {
        onData?.(data);
      });

      term.onResize(({ cols, rows }) => {
        onResize?.(cols, rows);
      });

      xtermRef.current = term;

      const handleResize = (): void => {
        fitAddon.fit();
      };

      window.addEventListener('resize', handleResize);

      cleanupRef.current = (): void => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    };

    void loadAddons();

    return () => {
      cleanupRef.current?.();
    };
  }, [onData, onResize]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    term.write(`Connected to ${host.name} (${host.hostname}:${host.port})\r\n`);
  }, [host]);

  return (
    <Box
      ref={terminalRef}
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
        '& .xterm': {
          height: '100%',
          padding: 1,
        },
      }}
    />
  );
}
