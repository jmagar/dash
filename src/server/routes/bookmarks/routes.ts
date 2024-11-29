import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import type { CreateBookmarkRequest, UpdateBookmarkRequest } from './dto/bookmarks.dto';

const router = Router();

// Get all bookmarks for the current user
router.get('/', asyncAuthHandler<Record<string, never>, any>(
  controller.getBookmarks
));

// Create a new bookmark
router.post('/', asyncAuthHandler<Record<string, never>, any, CreateBookmarkRequest>(
  controller.createBookmark
));

// Update a bookmark's notes
router.patch('/:hostId/:path', asyncAuthHandler<{ hostId: string; path: string }, any, UpdateBookmarkRequest>(
  controller.updateBookmark
));

// Delete a bookmark
router.delete('/:hostId/:path', asyncAuthHandler<{ hostId: string; path: string }, void>(
  controller.deleteBookmark
));

// Update last accessed time
router.post('/:hostId/:path/access', asyncAuthHandler<{ hostId: string; path: string }, void>(
  controller.updateLastAccessed
));

export default router;
