import { TokenPayload } from './auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}

export {};
