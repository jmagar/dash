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
  const [hosts, setHosts] = useState<Host[]>([]);

  const fetchHosts = useCallback(async (): Promise<void> => {
    try {
      logger.info('Fetching hosts...');
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/hosts');
      if (response.data.success) {
        const newHosts = response.data.data || [];
        logger.info('Hosts fetched successfully', {
          hostCount: newHosts.length,
          hosts: newHosts.map((h: Host) => ({ id: h.id, name: h.name })),
        });

        setHosts(newHosts);
        setHasHosts(newHosts.length > 0);

        // If we have a selected host, make sure it's still in the list
        if (selectedHost) {
          const hostStillExists = newHosts.some((h: Host) => h.id === selectedHost.id);
          if (!hostStillExists) {
            logger.info('Selected host no longer exists', { hostId: selectedHost.id });
            setSelectedHost(null);
          } else {
            // Update the selected host data
            const updatedHost = newHosts.find((h: Host) => h.id === selectedHost.id);
            if (updatedHost && JSON.stringify(updatedHost) !== JSON.stringify(selectedHost)) {
              logger.info('Updating selected host data', {
                hostId: selectedHost.id,
                changes: {
                  old: selectedHost,
                  new: updatedHost,
                },
              });
              setSelectedHost(updatedHost);
            }
          }
        } else if (newHosts.length > 0) {
          // If we don't have a selected host but we have hosts, select the first one
          logger.info('Setting initial host', { host: newHosts[0] });
          setSelectedHost(newHosts[0]);
        }
      } else {
        const errorMessage = response.data.error || 'Failed to fetch hosts';
        logger.error('Failed to fetch hosts', { error: errorMessage });
        setError(errorMessage);
        setHosts([]);
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
      setHosts([]);
      setHasHosts(false);
      setSelectedHost(null);
    } finally {
      setLoading(false);
    }
  }, [selectedHost]);

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

      if (host && !hosts.some((h: Host) => h.id === host.id)) {
        logger.warn('Attempted to select non-existent host', { hostId: host.id });
        return;
      }

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
  }, [selectedHost, hosts]);

  // Log state changes
  useEffect(() => {
    logger.debug('Host context state updated', {
      hasSelectedHost: !!selectedHost,
      selectedHostId: selectedHost?.id,
      loading,
      hasHosts,
      hostCount: hosts.length,
      hasError: !!error,
    });
  }, [selectedHost, loading, hasHosts, hosts, error]);

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
