import { Router } from 'express';
import { bookmarkService } from '../services/bookmarks.service';
import { requireAuth } from '../middleware/auth';
import { LoggingManager } from '../utils/logging/LoggingManager';

const router = Router();

// Apply authentication middleware to all bookmark routes
router.use(requireAuth);

// Get all bookmarks for the current user
router.get('/', async (req, res) => {
  try {
    const bookmarks = await bookmarkService.getBookmarks(req.user.id);
    res.json({
      success: true,
      data: bookmarks,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Failed to get bookmarks:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get bookmarks',
    });
  }
});

// Create a new bookmark
router.post('/', async (req, res) => {
  try {
    const { hostId, path, name, isDirectory, notes } = req.body;

    if (!hostId || !path || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const bookmark = await bookmarkService.createBookmark(
      req.user.id,
      hostId,
      path,
      name,
      isDirectory,
      notes,
    );

    res.json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Failed to create bookmark:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create bookmark',
    });
  }
});

// Update a bookmark's notes
router.patch('/:hostId/:path', async (req, res) => {
  try {
    const { hostId, path } = req.params;
    const { notes } = req.body;

    const bookmark = await bookmarkService.updateBookmark(req.user.id, hostId, path, {
      notes,
    });

    res.json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Failed to update bookmark:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update bookmark',
    });
  }
});

// Delete a bookmark
router.delete('/:hostId/:path', async (req, res) => {
  try {
    const { hostId, path } = req.params;

    await bookmarkService.deleteBookmark(req.user.id, hostId, path);

    res.json({
      success: true,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Failed to delete bookmark:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete bookmark',
    });
  }
});

// Update last accessed time
router.post('/:hostId/:path/access', async (req, res) => {
  try {
    const { hostId, path } = req.params;

    await bookmarkService.updateLastAccessed(req.user.id, hostId, path);

    res.json({
      success: true,
    });
  } catch (error) {
    LoggingManager.getInstance().error('Failed to update bookmark last accessed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update bookmark last accessed',
    });
  }
});

export default router;

