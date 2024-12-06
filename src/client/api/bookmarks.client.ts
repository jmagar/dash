import { BaseApiClient, type Endpoint } from './base.client';
import type { Bookmark, BookmarkCreateDto, BookmarkUpdateDto } from '@server/routes/bookmarks/dto';

interface BookmarksEndpoints extends Record<string, Endpoint> {
  LIST: '/api/bookmarks';
  CREATE: '/api/bookmarks';
  GET: (id: string) => string;
  UPDATE: (id: string) => string;
  DELETE: (id: string) => string;
}

const BOOKMARKS_ENDPOINTS: BookmarksEndpoints = {
  LIST: '/api/bookmarks',
  CREATE: '/api/bookmarks',
  GET: (id: string) => `/api/bookmarks/${id}`,
  UPDATE: (id: string) => `/api/bookmarks/${id}`,
  DELETE: (id: string) => `/api/bookmarks/${id}`,
};

class BookmarksClient extends BaseApiClient<BookmarksEndpoints> {
  constructor() {
    super(BOOKMARKS_ENDPOINTS);
  }

  async listBookmarks(): Promise<Bookmark[]> {
    const response = await this.get<Bookmark[]>(
      this.getEndpoint('LIST')
    );

    if (!response.data) {
      throw new Error('Failed to list bookmarks');
    }

    return response.data;
  }

  async createBookmark(bookmark: BookmarkCreateDto): Promise<Bookmark> {
    const response = await this.post<Bookmark>(
      this.getEndpoint('CREATE'),
      bookmark
    );

    if (!response.data) {
      throw new Error('Failed to create bookmark');
    }

    return response.data;
  }

  async getBookmark(id: string): Promise<Bookmark> {
    const response = await this.get<Bookmark>(
      this.getEndpoint('GET', id)
    );

    if (!response.data) {
      throw new Error('Failed to get bookmark');
    }

    return response.data;
  }

  async updateBookmark(id: string, bookmark: BookmarkUpdateDto): Promise<Bookmark> {
    const response = await this.put<Bookmark>(
      this.getEndpoint('UPDATE', id),
      bookmark
    );

    if (!response.data) {
      throw new Error('Failed to update bookmark');
    }

    return response.data;
  }

  async deleteBookmark(id: string): Promise<void> {
    const response = await this.delete<void>(
      this.getEndpoint('DELETE', id)
    );

    if (!response.success) {
      throw new Error('Failed to delete bookmark');
    }
  }
}

// Create a single instance
const bookmarksClient = new BookmarksClient();

// Export bound methods
export const {
  listBookmarks,
  createBookmark,
  getBookmark,
  updateBookmark,
  deleteBookmark,
} = bookmarksClient;
