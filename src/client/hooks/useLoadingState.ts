import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

interface LoadingStateMap {
  [key: string]: LoadingState;
}

export function useLoadingState() {
  const [loadingStates, setLoadingStates] = useState<LoadingStateMap>({});

  const startLoading = useCallback((key: string, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading: true, progress: 0, message },
    }));
  }, []);

  const updateProgress = useCallback((key: string, progress: number, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { ...prev[key], progress, message },
    }));
  }, []);

  const finishLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);

  const getLoadingState = useCallback((key: string): LoadingState => {
    return loadingStates[key] || { isLoading: false };
  }, [loadingStates]);

  const getAllLoadingStates = useCallback((): LoadingStateMap => {
    return loadingStates;
  }, [loadingStates]);

  const hasActiveOperations = useCallback((): boolean => {
    return Object.keys(loadingStates).length > 0;
  }, [loadingStates]);

  return {
    startLoading,
    updateProgress,
    finishLoading,
    getLoadingState,
    getAllLoadingStates,
    hasActiveOperations,
  };
}
