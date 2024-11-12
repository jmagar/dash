import axios from 'axios';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import type { Host } from '../../types';
import { logger } from '../utils/frontendLogger';

interface HostContextType {
  selectedHost: Host | null;
  setSelectedHost: (host: Host | null) => void;
  loading: boolean;
  hasHosts: boolean;
  refreshHosts: () => Promise<void>;
  error: string | null;
}

const HostContext = createContext<HostContextType | undefined>(undefined);

export function useHost(): HostContextType {
  const context = useContext(HostContext);
  if (!context) {
    throw new Error('useHost must be used within a HostProvider');
  }
  return context;
}

interface Props {
  children: React.ReactNode;
}

export function HostProvider({ children }: Props): JSX.Element {
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasHosts, setHasHosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHosts = useCallback(async (): Promise<void> => {
    try {
      logger.info('Fetching hosts...');
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/hosts');
      if (response.data.success) {
        const hosts = response.data.data || [];
        logger.info('Hosts fetched successfully', { hostCount: hosts.length });

        setHasHosts(hosts.length > 0);

        // Only set initial host if we don't have one selected
        if (hosts.length > 0 && !selectedHost) {
          logger.info('Setting initial host', { host: hosts[0] });
          setSelectedHost(hosts[0]);
        } else if (hosts.length === 0) {
          logger.info('No hosts available');
          setSelectedHost(null);
        }
      } else {
        const errorMessage = response.data.error || 'Failed to fetch hosts';
        logger.error('Failed to fetch hosts', { error: errorMessage });
        setError(errorMessage);
        setHasHosts(false);
        setSelectedHost(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error fetching hosts:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      setError(errorMessage);
      setHasHosts(false);
      setSelectedHost(null);
    } finally {
      setLoading(false);
    }
  }, [selectedHost]); // Remove selectedHost from deps to prevent loops

  // Initial fetch
  useEffect(() => {
    void fetchHosts();
  }, [fetchHosts]);

  const handleSetSelectedHost = useCallback((host: Host | null): void => {
    try {
      logger.info('Setting selected host', {
        previousHost: selectedHost?.id,
        newHost: host?.id,
      });

      setSelectedHost(host);
      setError(null);

      if (host) {
        setHasHosts(true);
        logger.info('Host selected successfully', { hostId: host.id });
      } else {
        logger.info('Host selection cleared');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set selected host';
      logger.error('Error setting selected host:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      setError(errorMessage);
    }
  }, [selectedHost]); // Remove selectedHost from deps

  // Log state changes
  useEffect(() => {
    logger.debug('Host context state updated', {
      hasSelectedHost: !!selectedHost,
      loading,
      hasHosts,
      hasError: !!error,
    });
  }, [selectedHost, loading, hasHosts, error]);

  const value = {
    selectedHost,
    setSelectedHost: handleSetSelectedHost,
    loading,
    hasHosts,
    refreshHosts: fetchHosts,
    error,
  };

  return (
    <HostContext.Provider value={value}>
      {children}
    </HostContext.Provider>
  );
}
