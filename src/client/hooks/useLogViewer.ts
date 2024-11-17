import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';
import type { LogEntry, LogFilter } from '../../types/logs';
import { logger } from '../utils/frontendLogger';

interface UseLogViewerOptions {
  maxLogs?: number;
  autoScroll?: boolean;
}

interface UseLogViewerResult {
  logs: LogEntry[];
  loading: boolean;
  error: string | null;
  subscribe: (hostIds: string[], filter?: LogFilter) => void;
  unsubscribe: (hostIds: string[]) => void;
  clearLogs: () => void;
  filterLogs: (filter: LogFilter) => void;
  downloadLogs: () => void;
}

export function useLogViewer({
  maxLogs = 1000,
  autoScroll = true,
}: UseLogViewerOptions = {}): UseLogViewerResult {
  const socket = useSocket();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<LogFilter | undefined>();

  const subscribe = useCallback((hostIds: string[], filter?: LogFilter) => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentFilter(filter);

      socket.emit('logs:subscribe', { hostIds, filter });
      logger.info('Subscribed to logs:', { hostIds, filter });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to subscribe to logs';
      setError(errorMsg);
      logger.error('Failed to subscribe to logs:', {
        error: errorMsg,
        hostIds,
        filter,
      });
    } finally {
      setLoading(false);
    }
  }, [socket]);

  const unsubscribe = useCallback((hostIds: string[]) => {
    if (!socket) {
      return;
    }

    try {
      socket.emit('logs:unsubscribe', { hostIds });
      logger.info('Unsubscribed from logs:', { hostIds });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unsubscribe from logs';
      logger.error('Failed to unsubscribe from logs:', {
        error: errorMsg,
        hostIds,
      });
    }
  }, [socket]);

  const filterLogs = useCallback((filter: LogFilter) => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      setCurrentFilter(filter);
      socket.emit('logs:filter', { filter });
      logger.info('Applied log filter:', { filter });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply log filter';
      setError(errorMsg);
      logger.error('Failed to apply log filter:', {
        error: errorMsg,
        filter,
      });
    }
  }, [socket]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const downloadLogs = useCallback(() => {
    try {
      const content = logs.map(log => JSON.stringify(log)).join('\n');
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to download logs';
      setError(errorMsg);
      logger.error('Failed to download logs:', {
        error: errorMsg,
      });
    }
  }, [logs]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.on('logs:new', (log: LogEntry) => {
      setLogs(prev => {
        const newLogs = [...prev, log];
        if (maxLogs && newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    });

    socket.on('logs:error', (data: { error: string }) => {
      setError(data.error);
      setLoading(false);
    });

    return () => {
      socket.off('logs:new');
      socket.off('logs:error');
    };
  }, [socket, maxLogs]);

  return {
    logs,
    loading,
    error,
    subscribe,
    unsubscribe,
    clearLogs,
    filterLogs,
    downloadLogs,
  };
}
