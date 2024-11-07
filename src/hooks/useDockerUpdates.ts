import { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'stopped' | 'paused';
  ports?: string[];
  createdAt?: string;
}

export interface Image {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdAt: string;
}

export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  size?: string;
}

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

export interface DockerUpdateHook<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useDockerUpdates = <T extends Container | Image | Volume | Network>(
  resourceType: 'containers' | 'images' | 'volumes' | 'networks',
  hostId?: number,
): DockerUpdateHook<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/docker/${resourceType}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${resourceType}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [resourceType]);

  const setupSocketConnection = useCallback(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token'),
      },
      query: {
        resourceType,
        hostId,
      },
    });

    newSocket.on('connect', () => {
      console.log(`Connected to ${resourceType} socket`);
    });

    newSocket.on(`docker.${resourceType}.update`, (updatedData: T[]) => {
      setData(updatedData);
    });

    newSocket.on('connect_error', (error: Error) => {
      setError(`Socket connection error: ${error.message}`);
    });

    setSocketInstance(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [resourceType, hostId]);

  const refresh = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchInitialData();
    const socketCleanup = setupSocketConnection();

    return () => {
      socketCleanup();
    };
  }, [fetchInitialData, setupSocketConnection]);

  return {
    data,
    loading,
    error,
    refresh,
  };
};

// Convenience hooks for specific resource types
export const useContainers = (hostId?: number) =>
  useDockerUpdates<Container>('containers', hostId);

export const useImages = (hostId?: number) =>
  useDockerUpdates<Image>('images', hostId);

export const useVolumes = (hostId?: number) =>
  useDockerUpdates<Volume>('volumes', hostId);

export const useNetworks = (hostId?: number) =>
  useDockerUpdates<Network>('networks', hostId);
