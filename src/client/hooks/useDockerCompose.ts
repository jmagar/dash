import { useState, useCallback } from 'react';
import { logger } from '../utils/frontendLogger';
import type { DockerComposeConfig } from '../../types/models-shared';
import { useSocket } from './useSocket';

interface UseDockerComposeOptions {
  hostId: string;
}

interface UseDockerComposeResult {
  configs: DockerComposeConfig[];
  loading: boolean;
  error: string | null;
  createConfig: (name: string, content: string) => Promise<void>;
  updateConfig: (name: string, content: string) => Promise<void>;
  deleteConfig: (name: string) => Promise<void>;
  getConfig: (name: string) => Promise<DockerComposeConfig | null>;
}

export function useDockerCompose({ hostId }: UseDockerComposeOptions): UseDockerComposeResult {
  const socket = useSocket();
  const [configs, setConfigs] = useState<DockerComposeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConfig = useCallback(async (name: string, content: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      setLoading(true);
      setError(null);

      await new Promise<void>((resolve, reject) => {
        socket.emit('docker:compose:create', { hostId, name, content }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });

      // Refresh configs list
      socket.emit('docker:compose:list', { hostId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create Docker Compose config';
      logger.error('Failed to create Docker Compose config:', {
        error: errorMessage,
        hostId,
        name,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [socket, hostId]);

  const updateConfig = useCallback(async (name: string, content: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      setLoading(true);
      setError(null);

      await new Promise<void>((resolve, reject) => {
        socket.emit('docker:compose:update', { hostId, name, content }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });

      // Refresh configs list
      socket.emit('docker:compose:list', { hostId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update Docker Compose config';
      logger.error('Failed to update Docker Compose config:', {
        error: errorMessage,
        hostId,
        name,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [socket, hostId]);

  const deleteConfig = useCallback(async (name: string) => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      setLoading(true);
      setError(null);

      await new Promise<void>((resolve, reject) => {
        socket.emit('docker:compose:delete', { hostId, name }, (response: { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });

      // Refresh configs list
      socket.emit('docker:compose:list', { hostId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete Docker Compose config';
      logger.error('Failed to delete Docker Compose config:', {
        error: errorMessage,
        hostId,
        name,
      });
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [socket, hostId]);

  const getConfig = useCallback(async (name: string): Promise<DockerComposeConfig | null> => {
    if (!socket) {
      throw new Error('Socket not connected');
    }

    try {
      setLoading(true);
      setError(null);

      const config = await new Promise<DockerComposeConfig>((resolve, reject) => {
        socket.emit('docker:compose:get', { hostId, name }, (response: { error?: string; config?: DockerComposeConfig }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else if (!response.config) {
            reject(new Error('Config not found'));
          } else {
            resolve(response.config);
          }
        });
      });

      return config;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get Docker Compose config';
      logger.error('Failed to get Docker Compose config:', {
        error: errorMessage,
        hostId,
        name,
      });
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [socket, hostId]);

  return {
    configs,
    loading,
    error,
    createConfig,
    updateConfig,
    deleteConfig,
    getConfig,
  };
}
