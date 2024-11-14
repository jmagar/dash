import type { Request as BaseRequest, Response, NextFunction, RequestHandler as BaseRequestHandler, ErrorRequestHandler as BaseErrorRequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

import type { AuthenticatedUser } from './jwt';

// Re-export FileArray type from express-fileupload
declare module 'express-fileupload' {
  interface FileArray {
    [fieldname: string]: UploadedFile | UploadedFile[];
  }

  interface UploadedFile {
    name: string;
    data: Buffer;
    size: number;
    encoding: string;
    tempFilePath: string;
    truncated: boolean;
    mimetype: string;
    md5: string;
    mv(path: string, callback: (err: Error | null) => void): void;
    mv(path: string): Promise<void>;
  }
}

// Define common response body types
export type JsonResponseBody = Record<string, unknown> | unknown[] | null;

// Extend the base Request type with our custom properties
export interface Request<
  P = ParamsDictionary,
  ResBody = JsonResponseBody,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> extends BaseRequest<P, ResBody, ReqBody, ReqQuery> {
  requestId?: string;
  user?: AuthenticatedUser;
  files?: import('express-fileupload').FileArray | null;
}

// Authenticated request requires user and requestId to be present
export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = JsonResponseBody,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user: NonNullable<Request['user']>;
  requestId: NonNullable<Request['requestId']>;
}

export type RequestHandler<
  P = ParamsDictionary,
  ResBody = JsonResponseBody,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> = BaseRequestHandler<P, ResBody, ReqBody, ReqQuery>;

export type ErrorRequestHandler<
  P = ParamsDictionary,
  ResBody = JsonResponseBody,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> = BaseErrorRequestHandler<P, ResBody, ReqBody, ReqQuery>;

export type AuthenticatedRequestHandler<
  P = ParamsDictionary,
  ResBody = JsonResponseBody,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<Response<ResBody> | void> | Response<ResBody> | void;

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<Response | void> | Response | void;

export type RequestParams = Record<string, string>;

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

// Declare module augmentations
declare module 'express' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
    files?: import('express-fileupload').FileArray | null;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
    files?: import('express-fileupload').FileArray | null;
  }
}
