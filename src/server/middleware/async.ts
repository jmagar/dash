import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../../types/express';
import type { AccessTokenPayloadDto, RefreshTokenPayloadDto } from '../../types/auth';

// Handler type for authenticated routes
type AuthHandler<P = any, ResBody = any, ReqBody = any> = (
  req: AuthenticatedRequest<P, any, ReqBody>,
  res: Response<ApiResponse<ResBody>>,
  next: NextFunction
) => Promise<void>;

/**
 * Creates an authenticated async route handler that:
 * - Ensures authentication
 * - Handles async errors
 * - Wraps responses in ApiResponse
 */
export function asyncAuthHandler<P = any, ResBody = any, ReqBody = any>(
  handler: AuthHandler<P, ResBody, ReqBody>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !isAccessTokenPayloadDto(req.user)) {
      next(new Error('Authentication required'));
      return;
    }

    const authReq = req as AuthenticatedRequest<P, any, ReqBody>;
    const typedRes = res as Response<ApiResponse<ResBody>>;

    Promise.resolve(handler(authReq, typedRes, next)).catch(next);
  };
}

// Type guard to validate AccessTokenPayloadDto | RefreshTokenPayloadDto
function isAccessTokenPayloadDto(user: unknown): user is AccessTokenPayloadDto | RefreshTokenPayloadDto {
  if (!user || typeof user !== 'object') return false;
  
  const payload = user as Partial<AccessTokenPayloadDto | RefreshTokenPayloadDto>;
  return (
    typeof payload.id === 'string' &&
    typeof payload.userId === 'string' &&
    typeof payload.username === 'string' &&
    (payload.role === 'admin' || payload.role === 'user') &&
    typeof payload.is_active === 'boolean' &&
    (payload.type === 'access' || payload.type === 'refresh')
  );
}
