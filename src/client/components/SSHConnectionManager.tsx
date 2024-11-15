import React, { useEffect, useState } from 'react';

import type { SystemStats } from '../../types/models-shared';
import { connectHost, disconnectHost, getHostStats } from '../api/hosts.client';
import { logger } from '../utils/logger';

interface SSHConnectionManagerProps {
  hostId: number;
}

export function SSHConnectionManager({ hostId }: SSHConnectionManagerProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getHostStats(hostId);
        setStats(data);
        setConnected(true);
        setError(null);
      } catch (err) {
        logger.error('Failed to fetch host stats:', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Failed to fetch host statistics');
        setStats(null);
        setConnected(false);
      }
    };

    if (connected) {
      fetchStats();
      const interval = setInterval(fetchStats, 5000);
      return () => clearInterval(interval);
    }
  }, [hostId, connected]);

  const handleConnect = async () => {
    try {
      setError(null);
      setLoading(true);
      await connectHost(hostId);
      setConnected(true);
    } catch (err) {
      logger.error('Failed to connect:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to connect to host');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setError(null);
      setLoading(true);
      await disconnectHost(hostId);
      setConnected(false);
      setStats(null);
    } catch (err) {
      logger.error('Failed to disconnect:', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError('Failed to disconnect from host');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ssh-connection-manager">
      <h2>SSH Connection Manager</h2>
      {error && <div className="error">{error}</div>}

      <div className="connection-controls">
        {connected ? (
          <button onClick={handleDisconnect} disabled={loading}>
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        ) : (
          <button onClick={handleConnect} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>

      {stats && (
        <div className="connection-stats">
          <div>
            CPU Usage: {stats.cpu.usage.toFixed(1)}% ({stats.cpu.cores} cores)
          </div>
          <div>
            Memory: {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
          </div>
          <div>
            Disk: {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
          </div>
          <div>
            Uptime: {formatUptime(stats.uptime)}
          </div>
          <div>
            Load Average: {stats.loadAvg.map((l: number) => l.toFixed(2)).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
}
