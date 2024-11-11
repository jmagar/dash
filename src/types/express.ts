import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import { AuthenticatedUser } from './jwt';

// Extend Request to include authenticated user
export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedUser;
}

// Generic handler type for express routes
export type RequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<Response<ResBody> | undefined | void> | Response<ResBody> | undefined | void;

// Generic authenticated handler type
export type AuthenticatedHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<Response<ResBody> | undefined | void> | Response<ResBody> | undefined | void;

// Helper function to create authenticated handlers
export const createAuthHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
>(
    handler: AuthenticatedHandler<P, ResBody, ReqBody, ReqQuery>,
  ): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return handler as RequestHandler<P, ResBody, ReqBody, ReqQuery>;
};
