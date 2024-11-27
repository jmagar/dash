import { BaseApiClient } from './base.client';
import type { Bookmark } from '@prisma/client';
import type { ApiResponse } from '../../types/express';

interface BookmarkEndpoints {
  LIST: string;
  CREATE: string;
  UPDATE: (hostId: string, path: string) => string;
  DELETE: (hostId: string, path: string) => string;
  ACCESS: (hostId: string, path: string) => string;
}

const BOOKMARK_ENDPOINTS: BookmarkEndpoints = {
  LIST: '/api/bookmarks',
  CREATE: '/api/bookmarks',
  UPDATE: (hostId: string, path: string) => `/api/bookmarks/${hostId}/${encodeURIComponent(path)}`,
  DELETE: (hostId: string, path: string) => `/api/bookmarks/${hostId}/${encodeURIComponent(path)}`,
  ACCESS: (hostId: string, path: string) => `/api/bookmarks/${hostId}/${encodeURIComponent(path)}/access`,
};

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

class BookmarkClient extends BaseApiClient<BookmarkEndpoints> {
  constructor() {
    super(BOOKMARK_ENDPOINTS);
  }

  async listBookmarks(): Promise<Bookmark[]> {
    const response = await this.get<Bookmark[]>(this.getEndpoint('LIST'));
    return response.data;
  }

  async createBookmark(params: CreateBookmarkParams): Promise<Bookmark> {
    const response = await this.post<Bookmark>(this.getEndpoint('CREATE'), params);
    return response.data;
  }

  async updateBookmark(
    hostId: string,
    path: string,
    params: UpdateBookmarkParams
  ): Promise<Bookmark> {
    const response = await this.put<Bookmark>(this.getEndpoint('UPDATE', hostId, path), params);
    return response.data;
  }

  async deleteBookmark(hostId: string, path: string): Promise<void> {
    await this.delete<void>(this.getEndpoint('DELETE', hostId, path));
  }

  async updateLastAccessed(hostId: string, path: string): Promise<void> {
    await this.post<void>(this.getEndpoint('ACCESS', hostId, path));
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
