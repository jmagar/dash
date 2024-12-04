import { z } from 'zod';
import { createRouter, createRouteHandler } from '../../utils/routeUtils';
import { bookmarkService } from '../../services/bookmarks.service';
import { requireAuth } from '../../middleware/auth';

// Validation schemas
const createBookmarkSchema = z.object({
  body: z.object({
    hostId: z.string(),
    path: z.string(),
    name: z.string(),
    isDirectory: z.boolean().optional(),
    notes: z.string().optional()
  })
});

const pathParamsSchema = z.object({
  params: z.object({
    hostId: z.string(),
    path: z.string()
  })
});

const updateBookmarkSchema = z.object({
  body: z.object({
    notes: z.string().optional()
  })
});

export const router = createRouter();

// Apply authentication middleware to all bookmark routes
router.use(requireAuth);

// Get all bookmarks for the current user
router.get('/', createRouteHandler(
  async (req) => await bookmarkService.getBookmarks(req.user.id),
  { requireAuth: true }
));

// Create a new bookmark
router.post('/', createRouteHandler(
  async (req) => {
    const { hostId, path, name, isDirectory, notes } = req.body;
    return await bookmarkService.createBookmark(
      req.user.id,
      hostId,
      path,
      name,
      isDirectory,
      notes
    );
  },
  {
    requireAuth: true,
    schema: createBookmarkSchema
  }
));

// Update a bookmark's notes
router.patch('/:hostId/:path', createRouteHandler(
  async (req) => {
    const { hostId, path } = req.params;
    const { notes } = req.body;
    return await bookmarkService.updateBookmark(req.user.id, hostId, path, {
      notes,
    });
  },
  {
    requireAuth: true,
    schema: {
      ...pathParamsSchema,
      ...updateBookmarkSchema
    }
  }
));

// Delete a bookmark
router.delete('/:hostId/:path', createRouteHandler(
  async (req) => {
    const { hostId, path } = req.params;
    return await bookmarkService.deleteBookmark(req.user.id, hostId, path);
  },
  {
    requireAuth: true,
    schema: pathParamsSchema
  }
));

// Update last accessed time
router.post('/:hostId/:path/access', createRouteHandler(
  async (req) => {
    const { hostId, path } = req.params;
    return await bookmarkService.updateLastAccessed(req.user.id, hostId, path);
  },
  {
    requireAuth: true,
    schema: pathParamsSchema
  }
));
