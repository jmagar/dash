import React, { createContext, useContext, useState } from 'react';

import type { Host } from '../../types';

interface HostContextType {
  selectedHost: Host | null;
  setSelectedHost: (host: Host | null) => void;
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

  return (
    <HostContext.Provider value={{ selectedHost, setSelectedHost }}>
      {children}
    </HostContext.Provider>
  );
}
