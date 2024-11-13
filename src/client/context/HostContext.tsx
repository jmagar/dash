import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { Host } from '../../types';
import { createApiError } from '../../types/error';
import { listHosts } from '../api/hosts.client';
import { logger } from '../utils/frontendLogger';

interface HostContextType {
  hosts: Host[];
  selectedHost: Host | null;
  hasHosts: boolean;
  loading: boolean;
  error: string | null;
  selectHost: (host: Host | null) => void;
  refreshHosts: () => Promise<void>;
}

const HostContext = createContext<HostContextType | undefined>(undefined);

export function useHost(): HostContextType {
  const context = useContext(HostContext);
  if (!context) {
    throw new Error('useHost must be used within a HostProvider');
  }
  return context;
}

interface HostProviderProps {
  children: React.ReactNode;
}

export function HostProvider({ children }: HostProviderProps): JSX.Element {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hasHosts, setHasHosts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHosts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await listHosts();
      if (!response.success || !response.data) {
        throw createApiError(response.error || 'Failed to fetch hosts');
      }

      setHosts(response.data);
      setHasHosts(response.data.length > 0);

      // Update selected host if it no longer exists
      if (selectedHost && !response.data.some((h: Host) => h.id === selectedHost.id)) {
        logger.info('Selected host no longer exists', { hostId: String(selectedHost.id) });
        setSelectedHost(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch hosts';
      setError(message);
      logger.error('Failed to fetch hosts:', { error: message });
    } finally {
      setLoading(false);
    }
  }, [selectedHost]);

  useEffect(() => {
    refreshHosts();
  }, [refreshHosts]);

  const selectHost = useCallback((host: Host | null): void => {
    try {
      setError(null);

      if (host && !hosts.some((h: Host) => h.id === host.id)) {
        logger.warn('Attempted to select non-existent host', { hostId: String(host.id) });
        throw createApiError('Selected host does not exist');
      }

      setSelectedHost(host);
      setHasHosts(true);

      if (host) {
        logger.info('Host selected successfully', { hostId: String(host.id) });
      } else {
        logger.info('Host deselected');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select host';
      setError(message);
      logger.error('Failed to select host:', { error: message });
    }
  }, [hosts]);

  const handleHostSelect = useCallback((newHost: Host): void => {
    selectHost(newHost);
    logger.info('New host added and selected', { hostId: String(newHost.id) });
  }, [selectHost]);

  const value = {
    hosts,
    selectedHost,
    hasHosts,
    loading,
    error,
    selectHost,
    refreshHosts,
  };

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}
