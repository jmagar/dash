import { useState, useCallback, useEffect } from 'react';
import { socket } from '../socket';
import type { DockerComposeConfig, DockerComposeState } from '@/types/docker';
import { logger } from '../utils/frontendLogger';
import { LoggingManager } from '../../server/utils/logging/LoggingManager';

export function useDockerCompose(hostId: string) {
  const [configs, setConfigs] = useState<DockerComposeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = useCallback(() => {
    setLoading(true);
    setError(null);

    socket.emit('docker:compose:list', { hostId }, (response: { error?: string; configs?: DockerComposeConfig[] }) => {
      if (response.error) {
        setError(response.error);
        loggerLoggingManager.getInstance().();
      } else if (response.configs) {
        setConfigs(response.configs);
      }
      setLoading(false);
    });
  }, [hostId]);

  const createConfig = useCallback(
    async (name: string, content: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket.emit('docker:compose:create', { hostId, name, content }, (response: { error?: string }) => {
          if (response.error) {
            loggerLoggingManager.getInstance().();
            reject(new Error(response.error));
          } else {
            fetchConfigs();
            resolve();
          }
        });
      });
    },
    [hostId, fetchConfigs]
  );

  const updateConfig = useCallback(
    async (name: string, content: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket.emit('docker:compose:update', { hostId, name, content }, (response: { error?: string }) => {
          if (response.error) {
            loggerLoggingManager.getInstance().();
            reject(new Error(response.error));
          } else {
            fetchConfigs();
            resolve();
          }
        });
      });
    },
    [hostId, fetchConfigs]
  );

  const deleteConfig = useCallback(
    async (name: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        socket.emit('docker:compose:delete', { hostId, name }, (response: { error?: string }) => {
          if (response.error) {
            loggerLoggingManager.getInstance().();
            reject(new Error(response.error));
          } else {
            fetchConfigs();
            resolve();
          }
        });
      });
    },
    [hostId, fetchConfigs]
  );

  const getConfig = useCallback(
    async (name: string): Promise<DockerComposeConfig> => {
      return new Promise((resolve, reject) => {
        socket.emit('docker:compose:get', { hostId, name }, (response: { error?: string; config?: DockerComposeConfig }) => {
          if (response.error || !response.config) {
            loggerLoggingManager.getInstance().();
            reject(new Error(response.error || 'Config not found'));
          } else {
            resolve(response.config);
          }
        });
      });
    },
    [hostId]
  );

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return {
    configs,
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    getConfig,
    refresh: fetchConfigs,
  };
}

