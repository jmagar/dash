import React from 'react';
import { CopilotKit, CopilotApiConfig } from '@copilotkit/react-core';
import { useAuth } from './AuthContext';
import { config } from '../config';

interface CopilotProviderProps {
  children: React.ReactNode;
}

export function CopilotProvider({ children }: CopilotProviderProps) {
  const { token } = useAuth();

  const apiConfig: CopilotApiConfig = {
    // We'll keep using our existing backend endpoint
    chatApiEndpoint: `${config.apiUrl}/ai/chat`,
    // Pass auth token
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Custom parameters to integrate with mem0ai
    params: {
      useMem0: true, // Signal backend to use mem0ai
    },
  };

  return (
    <CopilotKit apiConfig={apiConfig}>
      {children}
    </CopilotKit>
  );
}
