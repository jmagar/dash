import type { Request, Response, NextFunction, RequestHandler as ExpressRequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedUser } from './jwt';

// Extend base Request interface
declare module 'express' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
  }
}

// Authenticated request requires user to be present
export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedUser;
  requestId: string;
}

export type AuthenticatedRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<void>;

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> | void;

export type RequestParams = Record<string, string>;

export type RequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> = ExpressRequestHandler<P, ResBody, ReqBody, ReqQuery>;

export function createAuthHandler<P, ResBody, ReqBody, ReqQuery>(
  handler: AuthenticatedRequestHandler<P, ResBody, ReqBody, ReqQuery>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => {
    const authReq = req as AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>;
    try {
      await handler(authReq, res, next);
    } catch (error) {
      next(error);
    }
  };
}
