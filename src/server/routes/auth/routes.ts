import { Router } from 'express';
import { asyncAuthHandler } from '../../middleware/async';
import * as controller from './controller';
import { LoginDto, RefreshTokenRequestDto } from './dto/auth.dto';

const router = Router();

// Login
router.post('/login', asyncAuthHandler<Record<string, never>, any, LoginDto>(
  controller.login
));

// Logout
router.post('/logout', asyncAuthHandler<Record<string, never>, void>(
  controller.logout
));

// Validate token
router.get('/validate', asyncAuthHandler<Record<string, never>, any>(
  controller.validate
));

// Refresh token
router.post('/refresh', asyncAuthHandler<Record<string, never>, any, RefreshTokenRequestDto>(
  controller.refreshToken
));

export default router;
