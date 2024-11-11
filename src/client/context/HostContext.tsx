import axios from 'axios';
import React, { createContext, useContext, useState, useEffect } from 'react';

import type { Host } from '../../types';
import { logger } from '../utils/frontendLogger';

interface HostContextType {
  selectedHost: Host | null;
  setSelectedHost: (host: Host | null) => void;
  loading: boolean;
  hasHosts: boolean;
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
  const [hasHosts, setHasHosts] = useState(true);

  useEffect(() => {
    const fetchHosts = async (): Promise<void> => {
      try {
        const response = await axios.get('/api/hosts');
        if (response.data.success) {
          if (response.data.data.length > 0) {
            setSelectedHost(response.data.data[0]);
            setHasHosts(true);
          } else {
            setSelectedHost(null);
            setHasHosts(false);
          }
        }
      } catch (error) {
        logger.error('Error fetching hosts:', { error });
        setSelectedHost(null);
        setHasHosts(false);
      } finally {
        setLoading(false);
      }
    };

    void fetchHosts();
  }, []);

  return (
    <HostContext.Provider value={{ selectedHost, setSelectedHost, loading, hasHosts }}>
      {children}
    </HostContext.Provider>
  );
}
