import type { AuthenticatedRequest, Response, ApiResponse } from '../../../types/express';
import { ApiError } from '../../../types/error';
import { bookmarkService } from '../../services/bookmarks.service';
import type { 
  CreateBookmarkRequest, 
  UpdateBookmarkRequest,
  BookmarkResponse,
  BookmarkListResponse 
} from './dto/bookmarks.dto';

/**
 * Get all bookmarks for the current user
 */
export async function getBookmarks(
  req: AuthenticatedRequest<Record<string, never>>,
  res: Response<ApiResponse<BookmarkListResponse>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const bookmarks = await bookmarkService.getBookmarks(req.user.id);
  res.json({
    success: true,
    data: bookmarks
  });
}

/**
 * Create a new bookmark
 */
export async function createBookmark(
  req: AuthenticatedRequest<Record<string, never>, ApiResponse<BookmarkResponse>, CreateBookmarkRequest>,
  res: Response<ApiResponse<BookmarkResponse>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const { hostId, path, name, isDirectory, notes } = req.body;

  if (!hostId || !path || !name) {
    throw new ApiError('Missing required fields', undefined, 400);
  }

  const bookmark = await bookmarkService.createBookmark(
    req.user.id,
    hostId,
    path,
    name,
    isDirectory,
    notes
  );

  res.json({
    success: true,
    data: bookmark
  });
}

/**
 * Update a bookmark's notes
 */
export async function updateBookmark(
  req: AuthenticatedRequest<{ hostId: string; path: string }, ApiResponse<BookmarkResponse>, UpdateBookmarkRequest>,
  res: Response<ApiResponse<BookmarkResponse>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const { hostId, path } = req.params;
  const { notes } = req.body;

  const bookmark = await bookmarkService.updateBookmark(req.user.id, hostId, path, {
    notes
  });

  res.json({
    success: true,
    data: bookmark
  });
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(
  req: AuthenticatedRequest<{ hostId: string; path: string }>,
  res: Response<ApiResponse<void>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const { hostId, path } = req.params;
  await bookmarkService.deleteBookmark(req.user.id, hostId, path);

  res.json({
    success: true
  });
}

/**
 * Update last accessed time
 */
export async function updateLastAccessed(
  req: AuthenticatedRequest<{ hostId: string; path: string }>,
  res: Response<ApiResponse<void>>
): Promise<void> {
  if (!req.user) {
    throw new ApiError('Authentication required', undefined, 401);
  }

  const { hostId, path } = req.params;
  await bookmarkService.updateLastAccessed(req.user.id, hostId, path);

  res.json({
    success: true
  });
}
