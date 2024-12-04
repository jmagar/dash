import { createRouter, logRouteAccess } from '../routeUtils';
import chatRouter from '../../api/chat.server';
import { authenticateToken } from '../../middleware/auth';

export const router = createRouter();

// Apply authentication middleware to all chat routes
router.use(authenticateToken);

// Main chat endpoint that handles both CopilotKit and mem0ai
router.use('/', chatRouter);

// Logging middleware for chat routes
router.use((req, res, next) => {
  logRouteAccess('Chat route accessed', {
    method: req.method,
    path: req.path,
    userId: req.user?.id
  });
  next();
});
