import { useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import type { LogEntry, LogFilter } from '../../types/logger';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

interface UseLogViewerOptions {
  hostIds?: string[];
  initialFilter?: LogFilter;
  maxLogs?: number;
  autoScroll?: boolean;
}

interface UseLogViewerResult {
  logs: LogEntry[];
  filter: LogFilter | undefined;
  loading: boolean;
  error: string | null;
  updateFilter: (newFilter: LogFilter) => void;
  refresh: () => void;
  subscribe: (targetHostIds?: string[], targetFilter?: LogFilter) => void;
  unsubscribe: (targetHostIds?: string[]) => void;
  clearLogs: () => void;
  filterLogs: (newFilter: LogFilter) => void;
  autoScroll: boolean | undefined;
}

export function useLogViewer({
  hostIds = [],
  initialFilter,
  maxLogs = 1000,
  autoScroll = true,
}: UseLogViewerOptions): UseLogViewerResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter | undefined>(initialFilter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewLog = useCallback((...args: unknown[]) => {
    const log = args[0] as LogEntry;
    setLogs(prevLogs => {
      const newLogs = [log, ...prevLogs];
      // Keep only the last maxLogs to prevent memory issues
      return newLogs.slice(0, maxLogs);
    });
  }, [maxLogs]);

  const handleLogStream = useCallback((...args: unknown[]) => {
    const data = args[0] as { logs: LogEntry[] };
    setLogs(prevLogs => {
      const newLogs = [...data.logs, ...prevLogs];
      // Keep only the last maxLogs to prevent memory issues
      return newLogs.slice(0, maxLogs);
    });
  }, [maxLogs]);

  const subscribe = useCallback((targetHostIds?: string[], targetFilter?: LogFilter) => {
    setLoading(true);
    setError(null);

    socket.emit('logs:subscribe', {
      hostIds: targetHostIds || hostIds,
      filter: targetFilter || filter
    });
  }, [hostIds, filter]);

  const unsubscribe = useCallback((targetHostIds?: string[]) => {
    socket.emit('logs:unsubscribe', {
      hostIds: targetHostIds || hostIds
    });
  }, [hostIds]);

  const updateFilter = useCallback((newFilter: LogFilter) => {
    setFilter(newFilter);
    socket.emit('logs:filter', { filter: newFilter });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const filterLogs = useCallback((newFilter: LogFilter) => {
    setFilter(newFilter);
    socket.emit('logs:filter', { filter: newFilter });
  }, []);

  useEffect(() => {
    subscribe();

    const handleError = (...args: unknown[]) => {
      const [data] = args as [{ error: string }];
      setError(data.error);
      setLoading(false);
      loggerLoggingManager.getInstance().();
    };

    socket.on('logs:new', handleNewLog);
    socket.on('logs:stream', handleLogStream);
    socket.on('logs:error', handleError);

    return () => {
      unsubscribe();
      socket.off('logs:new', handleNewLog);
      socket.off('logs:stream', handleLogStream);
      socket.off('logs:error', handleError);
    };
  }, [hostIds, filter, subscribe, unsubscribe, handleNewLog, handleLogStream]);

  return {
    logs,
    filter,
    loading,
    error,
    updateFilter,
    refresh: subscribe,
    subscribe,
    unsubscribe,
    clearLogs,
    filterLogs,
    autoScroll,
  };
}

