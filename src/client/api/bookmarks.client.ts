import { BaseApiClient } from './base.client';
import type { Bookmark } from '@prisma/client';

const BOOKMARK_ENDPOINTS = {
  LIST: '/api/bookmarks',
  CREATE: '/api/bookmarks',
  UPDATE: (hostId: string, path: string) => `/api/bookmarks/${hostId}/${encodeURIComponent(path)}`,
  DELETE: (hostId: string, path: string) => `/api/bookmarks/${hostId}/${encodeURIComponent(path)}`,
  ACCESS: (hostId: string, path: string) => `/api/bookmarks/${hostId}/${encodeURIComponent(path)}/access`,
} as const;

interface CreateBookmarkParams {
  hostId: string;
  path: string;
  name: string;
  isDirectory: boolean;
  notes?: string;
}

interface UpdateBookmarkParams {
  notes: string;
}

class BookmarkClient extends BaseApiClient {
  constructor() {
    super(BOOKMARK_ENDPOINTS);
  }

  async listBookmarks(): Promise<Bookmark[]> {
    const response = await this.get<{ success: boolean; data: Bookmark[] }>(
      this.endpoints.LIST
    );
    return response.data;
  }

  async createBookmark(params: CreateBookmarkParams): Promise<Bookmark> {
    const response = await this.post<{ success: boolean; data: Bookmark }>(
      this.endpoints.CREATE,
      params
    );
    return response.data;
  }

  async updateBookmark(
    hostId: string,
    path: string,
    params: UpdateBookmarkParams
  ): Promise<Bookmark> {
    const response = await this.patch<{ success: boolean; data: Bookmark }>(
      this.endpoints.UPDATE(hostId, path),
      params
    );
    return response.data;
  }

  async deleteBookmark(hostId: string, path: string): Promise<void> {
    await this.delete<{ success: boolean }>(
      this.endpoints.DELETE(hostId, path)
    );
  }

  async updateLastAccessed(hostId: string, path: string): Promise<void> {
    await this.post<{ success: boolean }>(
      this.endpoints.ACCESS(hostId, path)
    );
  }
}

export const bookmarkClient = new BookmarkClient();
export const {
  listBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  updateLastAccessed,
} = bookmarkClient;
