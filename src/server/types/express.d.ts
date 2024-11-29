import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        [key: string]: unknown;
      };
      addCheckpoint?: (name: string) => void;
      startTime?: number;
      validatedData?: any;  // Type will be inferred from validateDto<T>
      validatedQuery?: any; // Type will be inferred from validateQuery<T>
    }
  }
}
