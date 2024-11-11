export interface JWTPayload {
  id: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

export interface TokenError extends Error {
  name: 'JsonWebTokenError' | 'TokenExpiredError';
}
