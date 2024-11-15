import React, { useEffect, useState } from 'react';

import type { SystemStats } from '../../types/models-shared';
import { getHostStats } from '../api/hosts.client';
import { useHost } from '../context/HostContext';
import { logger } from '../utils/logger';

export function Dashboard() {
  const { selectedHost } = useHost();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedHost) return;

    const fetchStats = async () => {
      try {
        const data = await getHostStats(selectedHost.id);
        setStats(data);
        setError(null);
      } catch (err) {
        logger.error('Failed to fetch host stats:', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        setError('Failed to fetch host statistics');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [selectedHost]);

  if (!selectedHost) {
    return <div>Please select a host first</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!stats) {
    return <div>No stats available</div>;
  }

  return (
    <div className="dashboard">
      <h2>System Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>CPU</h3>
          <div>Usage: {stats.cpu.usage.toFixed(1)}%</div>
          <div>Cores: {stats.cpu.cores}</div>
        </div>
        <div className="stat-card">
          <h3>Memory</h3>
          <div>Total: {formatBytes(stats.memory.total)}</div>
          <div>Used: {formatBytes(stats.memory.used)}</div>
          <div>Free: {formatBytes(stats.memory.free)}</div>
        </div>
        <div className="stat-card">
          <h3>Disk</h3>
          <div>Total: {formatBytes(stats.disk.total)}</div>
          <div>Used: {formatBytes(stats.disk.used)}</div>
          <div>Free: {formatBytes(stats.disk.free)}</div>
        </div>
        <div className="stat-card">
          <h3>System</h3>
          <div>Uptime: {formatUptime(stats.uptime)}</div>
          <div>Load Average: {stats.loadAvg.map((l: number) => l.toFixed(2)).join(', ')}</div>
        </div>
      </div>
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
