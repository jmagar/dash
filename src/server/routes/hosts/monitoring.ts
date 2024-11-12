import { testSSHConnection } from './pool';
import type { Host } from './types';
import { serverLogger as logger } from '../../../utils/serverLogger';
import { invalidateHostCache } from '../../cache';
import { query } from '../../db';

// Monitoring configuration
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 5000; // 5 seconds
const KEEP_ALIVE_INTERVAL = 10000; // 10 seconds
const KEEP_ALIVE_COUNT_MAX = 3;

// Active health checks map
const healthChecks = new Map<string, NodeJS.Timeout>();

export const startHostMonitoring = async (host: Host): Promise<void> => {
  if (healthChecks.has(host.id)) {
    return;
  }

  const checkHealth = async (): Promise<void> => {
    try {
      await testSSHConnection({
        host: host.hostname,
        port: host.port,
        username: host.username,
        password: host.password,
        privateKey: host.private_key,
        passphrase: host.passphrase,
        readyTimeout: CONNECTION_TIMEOUT,
        keepaliveInterval: KEEP_ALIVE_INTERVAL,
        keepaliveCountMax: KEEP_ALIVE_COUNT_MAX,
      });

      // Update host status to active
      await query(
        'UPDATE hosts SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [host.id],
      );
      await invalidateHostCache(host.id);

      logger.info('Host health check passed:', { hostId: host.id, hostname: host.hostname });
    } catch (error) {
      logger.error('Host health check failed:', {
        hostId: host.id,
        hostname: host.hostname,
        error: (error as Error).message,
      });

      // Update host status to inactive
      await query(
        'UPDATE hosts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [host.id],
      );
      await invalidateHostCache(host.id);

      // Attempt reconnection
      for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          logger.info('Attempting reconnection:', {
            hostId: host.id,
            hostname: host.hostname,
            attempt,
          });

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt - 1)));
          await testSSHConnection({
            host: host.hostname,
            port: host.port,
            username: host.username,
            password: host.password,
            privateKey: host.private_key,
            passphrase: host.passphrase,
            readyTimeout: CONNECTION_TIMEOUT,
          });

          // Update host status to active after successful reconnection
          await query(
            'UPDATE hosts SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [host.id],
          );
          await invalidateHostCache(host.id);

          logger.info('Host reconnection successful:', {
            hostId: host.id,
            hostname: host.hostname,
            attempt,
          });
          break;
        } catch (retryError) {
          logger.error('Host reconnection failed:', {
            hostId: host.id,
            hostname: host.hostname,
            attempt,
            error: (retryError as Error).message,
          });

          if (attempt === MAX_RETRY_ATTEMPTS) {
            logger.error('Max retry attempts reached:', {
              hostId: host.id,
              hostname: host.hostname,
              maxAttempts: MAX_RETRY_ATTEMPTS,
            });
          }
        }
      }
    }
  };

  // Start periodic health checks
  healthChecks.set(host.id, setInterval(checkHealth, HEALTH_CHECK_INTERVAL));
  logger.info('Started host monitoring:', { hostId: host.id, hostname: host.hostname });

  // Run initial health check
  await checkHealth();
};

export const stopHostMonitoring = (hostId: string): void => {
  const interval = healthChecks.get(hostId);
  if (interval) {
    clearInterval(interval);
    healthChecks.delete(hostId);
    logger.info('Stopped host monitoring:', { hostId });
  }
};

// Get monitoring status
export const getMonitoringStatus = (hostId: string): boolean => {
  return healthChecks.has(hostId);
};

// Get all monitored hosts
export const getMonitoredHosts = (): string[] => {
  return Array.from(healthChecks.keys());
};
