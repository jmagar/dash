import type { Bookmark } from '@prisma/client';

export interface CreateBookmarkRequest {
  /** Host ID for the bookmark */
  hostId: string;
  
  /** Path to bookmark */
  path: string;
  
  /** Name of the bookmark */
  name: string;
  
  /** Whether the bookmark is a directory */
  isDirectory: boolean;
  
  /** Optional notes for the bookmark */
  notes?: string;
}

export interface UpdateBookmarkRequest {
  /** Updated notes for the bookmark */
  notes?: string;
}

export type BookmarkResponse = Bookmark;
export type BookmarkListResponse = Bookmark[];
