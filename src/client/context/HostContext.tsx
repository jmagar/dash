import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Host } from '../../types/models-shared';
import { listHosts } from '../api/hosts.client';
import { logger } from '../utils/logger';

interface HostContextType {
  hosts: Host[];
  selectedHost: Host | null;
  setSelectedHost: React.Dispatch<React.SetStateAction<Host | null>>;
  loading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
}

const HostContext = createContext<HostContextType | undefined>(undefined);

export function HostProvider({ children }: { children: React.ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHosts = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listHosts();
      setHosts(data);

      // If there's a selected host, update it with fresh data
      if (selectedHost) {
        const updatedHost = data.find(h => h.id === selectedHost.id);
        setSelectedHost(updatedHost || null);
      }
    } catch (err) {
      logger.error('Failed to load hosts:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to load hosts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  return (
    <HostContext.Provider
      value={{
        hosts,
        selectedHost,
        setSelectedHost,
        loading,
        error,
        refreshHosts: loadHosts,
      }}
    >
      {children}
    </HostContext.Provider>
  );
}

export function useHost() {
  const context = useContext(HostContext);
  if (!context) {
    throw new Error('useHost must be used within a HostProvider');
  }
  return context;
}
