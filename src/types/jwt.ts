export interface DecodedToken extends Record<string, unknown> {
  id: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

export interface JwtPayload extends Record<string, unknown> {
  id: string;
  username: string;
  role: string;
}
