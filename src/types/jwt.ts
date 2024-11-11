export interface DecodedToken {
  id: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export interface JwtPayload {
  id: string;
  username: string;
  role: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}
