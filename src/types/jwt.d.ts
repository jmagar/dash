import type { User } from './auth';

declare module 'jsonwebtoken' {
  export interface JWTPayload {
    id: string;
    username?: string;
    role?: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
  }

  export class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  }

  export class TokenExpiredError extends JsonWebTokenError {
    expiredAt: Date;

    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  }

  export interface SignOptions {
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    algorithm?: string;
    keyid?: string;
    issuer?: string;
    subject?: string;
    jwtid?: string;
    noTimestamp?: boolean;
    header?: object;
    encoding?: string;
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify<T extends JWTPayload = JWTPayload>(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): T;

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | RegExp | Array<string | RegExp>;
    complete?: boolean;
    issuer?: string | string[];
    jwtid?: string;
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    subject?: string;
    clockTolerance?: number;
    maxAge?: string | number;
    clockTimestamp?: number;
    nonce?: string;
  }
}
