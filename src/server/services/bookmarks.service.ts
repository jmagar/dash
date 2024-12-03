import { Bookmark } from '@prisma/client';
import prisma from '../db';
import { LoggingManager } from '../utils/logging/LoggingManager';

export class BookmarkService {
  async getBookmarks(userId: string): Promise<Bookmark[]> {
    try {
      return await prisma.bookmark.findMany({
        where: { userId },
        orderBy: { lastAccessed: 'desc' },
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get bookmarks:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  async getBookmark(userId: string, hostId: string, path: string): Promise<Bookmark | null> {
    try {
      return await prisma.bookmark.findFirst({
        where: { userId, hostId, path },
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to get bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
        path,
      });
      throw error;
    }
  }

  async createBookmark(
    userId: string,
    hostId: string,
    path: string,
    name: string,
    isDirectory: boolean,
    notes?: string,
  ): Promise<Bookmark> {
    try {
      return await prisma.bookmark.create({
        data: {
          userId,
          hostId,
          path,
          name,
          isDirectory,
          notes,
        },
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to create bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
        path,
      });
      throw error;
    }
  }

  async updateBookmark(
    userId: string,
    hostId: string,
    path: string,
    updates: Partial<Pick<Bookmark, 'notes' | 'lastAccessed'>>,
  ): Promise<Bookmark> {
    try {
      return await prisma.bookmark.update({
        where: { userId_hostId_path: { userId, hostId, path } },
        data: updates,
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
        path,
      });
      throw error;
    }
  }

  async deleteBookmark(userId: string, hostId: string, path: string): Promise<void> {
    try {
      await prisma.bookmark.delete({
        where: { userId_hostId_path: { userId, hostId, path } },
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to delete bookmark:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
        path,
      });
      throw error;
    }
  }

  async updateLastAccessed(userId: string, hostId: string, path: string): Promise<void> {
    try {
      await this.updateBookmark(userId, hostId, path, {
        lastAccessed: new Date(),
      });
    } catch (error) {
      LoggingManager.getInstance().error('Failed to update bookmark last accessed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        hostId,
        path,
      });
      // Don't throw error for last accessed updates
    }
  }
}

export const bookmarkService = new BookmarkService();

