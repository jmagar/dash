export interface JWTPayload {
  id: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  iat: number;
  exp: number;
}

export interface TokenError extends Error {
  name: 'JsonWebTokenError' | 'TokenExpiredError';
}
