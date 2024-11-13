import React, { useEffect, useState } from 'react';

import type { SystemStats } from '../../types';
import { getHostStatus, testConnection } from '../api/hosts.client';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/frontendLogger';

export default function Dashboard(): JSX.Element {
  const { selectedHost } = useHost();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedHost) return;

    const fetchStats = async (): Promise<void> => {
      try {
        setError(null);
        const result = await getHostStatus(selectedHost.id);
        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(result.error || 'Failed to fetch host status');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        logger.error('Error fetching host status:', { error: errorMessage });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
    const timer = setInterval(() => void fetchStats(), 5000);

    return () => {
      clearInterval(timer);
    };
  }, [selectedHost]);

  const handleTestConnection = async (): Promise<void> => {
    if (!selectedHost) return;

    try {
      setError(null);
      const result = await testConnection(selectedHost.id);
      if (!result.success) {
        setError(result.error || 'Connection test failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      logger.error('Error testing connection:', { error: errorMessage });
      setError(errorMessage);
    }
  };

  if (!selectedHost) {
    return (
      <div className="dashboard">
        <h2>Dashboard</h2>
        <p>Please select a host to view its status.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="dashboard">
        <h2>Dashboard</h2>
        <p>Loading host status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <h2>Dashboard</h2>
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleTestConnection}>Test Connection</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard">
        <h2>Dashboard</h2>
        <p>No stats available.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="host-info">
        <h3>{selectedHost.name}</h3>
        <p>{selectedHost.hostname}</p>
      </div>
      <div className="stats">
        <div className="stat">
          <h4>CPU Usage</h4>
          <p>{stats.cpu.toFixed(1)}%</p>
        </div>
        <div className="stat">
          <h4>Memory Usage</h4>
          <p>
            {(stats.memory.used / 1024 / 1024 / 1024).toFixed(1)} GB /{' '}
            {(stats.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
          </p>
        </div>
        <div className="stat">
          <h4>Disk Usage</h4>
          <p>
            {(stats.disk.used / 1024 / 1024 / 1024).toFixed(1)} GB /{' '}
            {(stats.disk.total / 1024 / 1024 / 1024).toFixed(1)} GB
          </p>
        </div>
        <div className="stat">
          <h4>Network</h4>
          <p>
            ↓ {(stats.network.rx / 1024 / 1024).toFixed(1)} MB/s | ↑{' '}
            {(stats.network.tx / 1024 / 1024).toFixed(1)} MB/s
          </p>
        </div>
      </div>
    </div>
  );
}
