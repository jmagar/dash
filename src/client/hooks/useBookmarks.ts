import { useCallback, useEffect, useState } from 'react';
import { Bookmark } from '@prisma/client';
import {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  updateLastAccessed,
} from '../api/bookmarks.client';
import { logger } from '../utils/logger';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load bookmarks from API
  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const data = await listBookmarks();
        setBookmarks(data);
      } catch (error) {
        logger.error('Failed to load bookmarks:', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        setError(error instanceof Error ? error : new Error('Failed to load bookmarks'));
      } finally {
        setLoading(false);
      }
    };

    void fetchBookmarks();
  }, []);

  const addBookmark = useCallback(async (
    hostId: string,
    path: string,
    name: string,
    isDirectory: boolean,
    notes?: string
  ) => {
    try {
      const bookmark = await createBookmark({
        hostId,
        path,
        name,
        isDirectory,
        notes,
      });
      setBookmarks(prev => [...prev, bookmark]);

      // Update chatbot context
      void fetch('/api/chat/context/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarks: [...bookmarks, bookmark].map(b => ({
            path: b.path,
            hostId: b.hostId,
            notes: b.notes,
          })),
        }),
      });

      return bookmark;
    } catch (error) {
      logger.error('Failed to add bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      throw error;
    }
  }, [bookmarks]);

  const removeBookmark = useCallback(async (hostId: string, path: string) => {
    try {
      await deleteBookmark(hostId, path);
      setBookmarks(prev => prev.filter(b => !(b.hostId === hostId && b.path === path)));

      // Update chatbot context
      void fetch('/api/chat/context/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarks: bookmarks
            .filter(b => !(b.hostId === hostId && b.path === path))
            .map(b => ({
              path: b.path,
              hostId: b.hostId,
              notes: b.notes,
            })),
        }),
      });
    } catch (error) {
      logger.error('Failed to remove bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      throw error;
    }
  }, [bookmarks]);

  const updateBookmarkNotes = useCallback(async (
    hostId: string,
    path: string,
    notes: string
  ) => {
    try {
      const updatedBookmark = await updateBookmark(hostId, path, { notes });
      setBookmarks(prev =>
        prev.map(b =>
          b.hostId === hostId && b.path === path ? updatedBookmark : b
        )
      );

      // Update chatbot context
      void fetch('/api/chat/context/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarks: bookmarks.map(b => ({
            path: b.path,
            hostId: b.hostId,
            notes: b.hostId === hostId && b.path === path ? notes : b.notes,
          })),
        }),
      });
    } catch (error) {
      logger.error('Failed to update bookmark notes:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      throw error;
    }
  }, [bookmarks]);

  const updateLastAccessedTime = useCallback(async (hostId: string, path: string) => {
    try {
      await updateLastAccessed(hostId, path);
      const now = new Date();
      setBookmarks(prev =>
        prev.map(b =>
          b.hostId === hostId && b.path === path
            ? { ...b, lastAccessed: now }
            : b
        )
      );
    } catch (error) {
      logger.error('Failed to update bookmark last accessed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      // Don't throw error for last accessed updates
    }
  }, []);

  const isBookmarked = useCallback((hostId: string, path: string) => {
    return bookmarks.some(b => b.hostId === hostId && b.path === path);
  }, [bookmarks]);

  const getBookmark = useCallback((hostId: string, path: string) => {
    return bookmarks.find(b => b.hostId === hostId && b.path === path);
  }, [bookmarks]);

  return {
    bookmarks,
    loading,
    error,
    addBookmark,
    removeBookmark,
    updateBookmarkNotes,
    updateLastAccessedTime,
    isBookmarked,
    getBookmark,
  };
}
