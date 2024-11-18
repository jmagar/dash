import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormGroup,
  FormControlLabel,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { LogEntry, LogFilter } from '@/types/logging';
import { useLogViewer } from '../hooks/useLogViewer';
import { ErrorBoundary } from './ErrorBoundary';

interface LogViewerProps {
  hostIds: string[];
  userId: string;
  maxLogs?: number;
}

const ROW_HEIGHT = 60;

interface LogRowData {
  logs: LogEntry[];
  getLevelIcon: (level: string) => JSX.Element;
  getLevelColor: (level: string) => string;
}

interface LogRowProps extends ListChildComponentProps {
  data: LogRowData;
}

const LogRow = React.memo(({ data, index, style }: LogRowProps) => {
  const log = data.logs[index];
  return (
    <div style={style} className={`log-row ${log.level}`}>
      <span className="timestamp">{log.timestamp}</span>
      <span className={`level ${log.level}`}>{log.level}</span>
      <span className="source">{log.source}</span>
      <span className="message">{log.message}</span>
    </div>
  );
});

LogRow.displayName = 'LogRow';

function LogViewerContent({ hostIds, maxLogs }: LogViewerProps) {
  const theme = useTheme();
  const [selectedLevel, setSelectedLevel] = useState<'debug' | 'info' | 'warn' | 'error'>('info');
  const [showFilters, setShowFilters] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = React.useRef<List | null>(null);

  const {
    logs,
    loading,
    error,
    subscribe,
    unsubscribe,
    clearLogs,
    filterLogs
  } = useLogViewer({
    maxLogs,
    autoScroll
  });

  useEffect(() => {
    if (hostIds.length > 0) {
      const filter: LogFilter = {
        level: selectedLevel
      };
      subscribe(hostIds, filter);
    }

    return () => {
      if (hostIds.length > 0) {
        unsubscribe(hostIds);
      }
    };
  }, [hostIds, selectedLevel, subscribe, unsubscribe]);

  useEffect(() => {
    if (autoScroll && listRef.current && logs.length > 0) {
      listRef.current.scrollToItem(logs.length - 1);
    }
  }, [logs, autoScroll]);

  const handleLevelChange = useCallback((level: 'debug' | 'info' | 'warn' | 'error') => {
    setSelectedLevel(level);
    filterLogs({ level });
  }, [filterLogs]);

  const handleAutoScrollChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAutoScroll(event.target.checked);
  }, []);

  const handleRefresh = useCallback(() => {
    const filter: LogFilter = {
      level: selectedLevel
    };
    subscribe(hostIds, filter);
  }, [hostIds, selectedLevel, subscribe]);

  const getLevelIcon = useCallback((level: string): JSX.Element => {
    switch (level) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warn':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon color="action" />;
    }
  }, []);

  const getLevelColor = useCallback((level: string): string => {
    switch (level) {
      case 'error':
        return theme.palette.error.main;
      case 'warn':
        return theme.palette.warning.main;
      case 'info':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  }, [theme]);

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={handleRefresh}
          >
            <RefreshIcon />
          </IconButton>
        }
      >
        Failed to load logs: {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="h6">Logs</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={autoScroll}
                onChange={handleAutoScrollChange}
                size="small"
              />
            }
            label="Auto-scroll"
          />
          <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
            <FilterIcon />
          </IconButton>
          <IconButton onClick={clearLogs}>
            <ClearIcon />
          </IconButton>
          <IconButton onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {showFilters && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <FormGroup row>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedLevel === 'info'}
                  onChange={() => handleLevelChange('info')}
                  color="info"
                />
              }
              label="Info"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedLevel === 'warn'}
                  onChange={() => handleLevelChange('warn')}
                  color="warning"
                />
              }
              label="Warning"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedLevel === 'error'}
                  onChange={() => handleLevelChange('error')}
                  color="error"
                />
              }
              label="Error"
            />
          </FormGroup>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <CircularProgress />
          </Box>
        ) : logs.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%'
            }}
          >
            <Typography color="textSecondary">No logs to display</Typography>
          </Box>
        ) : (
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={logs.length}
                itemSize={ROW_HEIGHT}
                itemData={{
                  logs,
                  getLevelIcon,
                  getLevelColor
                }}
              >
                {LogRow}
              </List>
            )}
          </AutoSizer>
        )}
      </Box>
    </Paper>
  );
}

export function LogViewer(props: LogViewerProps) {
  return (
    <ErrorBoundary>
      <LogViewerContent {...props} />
    </ErrorBoundary>
  );
}
