import { useCallback, useEffect, useState } from 'react';
import { Bookmark } from '@prisma/client';
import {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  updateLastAccessed,
} from '../api/bookmarks.client';
import { frontendLogger } from '../utils/frontendLogger';

interface BookmarkContext {
  path: string;
  hostId: string;
  notes: string | null;
}

interface ChatContextResponse {
  success: boolean;
  error?: string;
}

async function updateChatContext(bookmarks: BookmarkContext[]): Promise<void> {
  try {
    const response = await fetch('/api/chat/context/bookmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookmarks }),
    });
    
    const data = await response.json() as ChatContextResponse;
    if (!data.success) {
      throw new Error(data.error || 'Failed to update chat context');
    }
  } catch (error) {
    frontendLogger.error('Failed to update chat context:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw error for context updates
  }
}

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
        frontendLogger.error('Failed to load bookmarks:', {
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
  ): Promise<Bookmark> => {
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
      const contextBookmarks = [...bookmarks, bookmark].map(b => ({
        path: b.path,
        hostId: b.hostId,
        notes: b.notes,
      }));
      void updateChatContext(contextBookmarks);

      return bookmark;
    } catch (error) {
      frontendLogger.error('Failed to add bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      throw error;
    }
  }, [bookmarks]);

  const removeBookmark = useCallback(async (hostId: string, path: string): Promise<void> => {
    try {
      await deleteBookmark(hostId, path);
      setBookmarks(prev => prev.filter(b => !(b.hostId === hostId && b.path === path)));

      // Update chatbot context
      const contextBookmarks = bookmarks
        .filter(b => !(b.hostId === hostId && b.path === path))
        .map(b => ({
          path: b.path,
          hostId: b.hostId,
          notes: b.notes,
        }));
      void updateChatContext(contextBookmarks);
    } catch (error) {
      frontendLogger.error('Failed to remove bookmark:', {
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
  ): Promise<void> => {
    try {
      const updatedBookmark = await updateBookmark(hostId, path, { notes });
      setBookmarks(prev =>
        prev.map(b =>
          b.hostId === hostId && b.path === path ? updatedBookmark : b
        )
      );

      // Update chatbot context
      const contextBookmarks = bookmarks.map(b => ({
        path: b.path,
        hostId: b.hostId,
        notes: b.hostId === hostId && b.path === path ? notes : b.notes,
      }));
      void updateChatContext(contextBookmarks);
    } catch (error) {
      frontendLogger.error('Failed to update bookmark notes:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      throw error;
    }
  }, [bookmarks]);

  const updateLastAccessedTime = useCallback(async (hostId: string, path: string): Promise<void> => {
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
      frontendLogger.error('Failed to update bookmark last accessed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId,
        path,
      });
      // Don't throw error for last accessed updates
    }
  }, []);

  const isBookmarked = useCallback((hostId: string, path: string): boolean => {
    return bookmarks.some(b => b.hostId === hostId && b.path === path);
  }, [bookmarks]);

  const getBookmark = useCallback((hostId: string, path: string): Bookmark | undefined => {
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
