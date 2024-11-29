import { AccessTokenPayloadDto| RefreshTokenPayloadDto } from './auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayloadDto| RefreshTokenPayloadDto;
  }
}

export {};
