import { z } from 'zod';
import { createRouter, createRouteHandler } from '../../utils/routeUtils';
import { authService } from '../../services/auth.service';
import { cacheService } from '../../services/cache.service';
import { ApiError } from '../../../types/error';

// Validation schemas
const loginSchema = z.object({
  body: z.object({
    username: z.string(),
    password: z.string(),
    rememberMe: z.boolean().optional(),
    deviceId: z.string().optional()
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string()
  })
});

export const router = createRouter();

// Login route
router.post('/login', createRouteHandler(
  async (req) => {
    const { username, password, rememberMe, deviceId } = req.body;
    return await authService.login(username, password, rememberMe, deviceId);
  },
  { schema: loginSchema }
));

// Logout route
router.post('/logout', createRouteHandler(
  async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError('No token provided', 401);
    }
    await cacheService.removeSession(token);
    return { message: 'Logged out successfully' };
  },
  { requireAuth: true }
));

// Refresh token route
router.post('/refresh', createRouteHandler(
  async (req) => {
    const { refreshToken } = req.body;
    return await authService.refreshToken(refreshToken);
  },
  { schema: refreshSchema }
));

// Validate route
router.get('/validate', createRouteHandler(
  async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError('No token provided', 401);
    }

    const session = await cacheService.getSession(token);
    if (!session) {
      throw new ApiError('Invalid session', 401);
    }

    return {
      success: true,
      valid: true,
      user: {
        ...session.user,
        token,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt
      }
    };
  },
  { requireAuth: true }
));
