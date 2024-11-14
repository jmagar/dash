/// <reference types="express" />
import type { Logger } from './logger';
import type { AuthenticatedUser } from './jwt';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthenticatedUser;
    }

    interface Locals {
      logger: Logger;
      trackDbTime: (time: number) => void;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
  }

  interface Locals {
    logger: Logger;
    trackDbTime: (time: number) => void;
  }
}

// Export to ensure this is treated as a module
export {};
