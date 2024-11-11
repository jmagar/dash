import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';

import { AuthenticatedUser } from './jwt';

export interface AuthenticatedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends Query = Query,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedUser;
}

export type AuthHandler<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends Query = Query,
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<void | Response<ResBody>> | void | Response<ResBody>;

export const createAuthHandler = <
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends Query = Query,
>(
    handler: AuthHandler<P, ResBody, ReqBody, ReqQuery>,
  ): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => {
    return handler(req as AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, res, next);
  };
};
