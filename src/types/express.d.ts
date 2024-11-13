/// <reference types="express" />
import type { Logger } from './logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        username: string;
        role: string;
      };
    }

    interface Locals {
      logger: Logger;
      trackDbTime: (time: number) => void;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    user?: {
      id: string;
      username: string;
      role: string;
    };
  }

  interface Locals {
    logger: Logger;
    trackDbTime: (time: number) => void;
  }
}

// Export to ensure this is treated as a module
export {};
