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

      socket.emit('logs:subscribe', { hostIds, filter }, (response: { error?: string }) => {
        if (response.error) {
          throw new Error(response.error);
        }
        logger.info('Subscribed to logs:', { hostIds, filter });
      });
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
    if (!socket) return;

    try {
      socket.emit('logs:unsubscribe', { hostIds }, (response: { error?: string }) => {
        if (response.error) {
          throw new Error(response.error);
        }
        logger.info('Unsubscribed from logs:', { hostIds });
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unsubscribe from logs';
      logger.error('Failed to unsubscribe from logs:', {
        error: errorMsg,
        hostIds,
      });
    }
  }, [socket]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const filterLogs = useCallback((filter: LogFilter) => {
    if (!socket) {
      setError('Socket not connected');
      return;
    }

    try {
      setCurrentFilter(filter);
      socket.emit('logs:filter', { filter }, (response: { error?: string }) => {
        if (response.error) {
          throw new Error(response.error);
        }
        logger.info('Applied log filter:', { filter });
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to apply log filter';
      setError(errorMsg);
      logger.error('Failed to apply log filter:', {
        error: errorMsg,
        filter,
      });
    }
  }, [socket]);

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
      logger.error('Failed to download logs:', { error: errorMsg });
    }
  }, [logs]);

  useEffect(() => {
    if (!socket) return;

    const handleNewLog = (log: LogEntry) => {
      setLogs(prev => {
        const newLogs = [...prev, log];
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });

      if (autoScroll) {
        window.scrollTo(0, document.body.scrollHeight);
      }
    };

    const handleError = (err: { error: string }) => {
      setError(err.error);
      logger.error('Log viewer error:', { error: err.error });
    };

    socket.on('logs:new', handleNewLog);
    socket.on('logs:error', handleError);

    return () => {
      socket.off('logs:new', handleNewLog);
      socket.off('logs:error', handleError);
    };
  }, [socket, maxLogs, autoScroll]);

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
