import { useCallback, useEffect, useRef } from 'react';
import { FileInfo } from '../components/FileExplorer';

interface CacheEntry {
  files: FileInfo[];
  timestamp: number;
}

interface DirectoryCache {
  [key: string]: CacheEntry;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Maximum number of directories to cache

export function useDirectoryCache() {
  const cacheRef = useRef<DirectoryCache>({});

  // Clean up expired cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    Object.entries(cache).forEach(([key, entry]) => {
      if (now - entry.timestamp > CACHE_EXPIRY) {
        delete cache[key];
      }
    });

    // If we're still over the limit, remove oldest entries
    const entries = Object.entries(cache).sort(
      (a, b) => b[1].timestamp - a[1].timestamp
    );

    if (entries.length > MAX_CACHE_SIZE) {
      entries.slice(MAX_CACHE_SIZE).forEach(([key]) => {
        delete cache[key];
      });
    }
  }, []);

  // Get files from cache
  const getCachedFiles = useCallback((hostId: string, path: string): FileInfo[] | null => {
    const key = `${hostId}:${path}`;
    const entry = cacheRef.current[key];
    
    if (!entry) return null;
    
    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
      delete cacheRef.current[key];
      return null;
    }
    
    return entry.files;
  }, []);

  // Add files to cache
  const cacheFiles = useCallback((hostId: string, path: string, files: FileInfo[]) => {
    cleanCache();
    
    const key = `${hostId}:${path}`;
    cacheRef.current[key] = {
      files,
      timestamp: Date.now(),
    };
  }, [cleanCache]);

  // Clear specific path from cache
  const invalidateCache = useCallback((hostId: string, path: string) => {
    const key = `${hostId}:${path}`;
    delete cacheRef.current[key];
  }, []);

  // Clear entire cache
  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  // Clean up expired entries periodically
  useEffect(() => {
    const interval = setInterval(cleanCache, CACHE_EXPIRY);
    return () => clearInterval(interval);
  }, [cleanCache]);

  return {
    getCachedFiles,
    cacheFiles,
    invalidateCache,
    clearCache,
  };
}
