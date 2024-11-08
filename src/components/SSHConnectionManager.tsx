import React, { useState, useEffect } from 'react';

import { getHostStatus } from '../api/hosts';
import { Host } from '../types/models';

interface SSHConnectionManagerProps {
  hostId: number;
}

const SSHConnectionManager: React.FC<SSHConnectionManagerProps> = ({ hostId }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const checkConnection = async (): Promise<void> => {
      try {
        const result = await getHostStatus();
        if (result.success && result.data) {
          const host = result.data.find((h: Host) => h.id === hostId);
          if (host?.isActive !== undefined) {
            setIsConnected(host.isActive);
          }
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, [hostId]);

  return (
    <div>
      <span>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
};

export default SSHConnectionManager;
