import type { Request as BaseRequest, Response as BaseResponse, NextFunction as BaseNextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { AccessTokenPayloadDto, RefreshTokenPayloadDto } from './auth';

// Base API response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Request types
export type RequestParams = ParamsDictionary
export type RequestQuery = ParsedQs
export interface RequestBody {
  [key: string]: unknown;
}

// Authenticated request with user
export interface AuthenticatedRequest<
  P = RequestParams,
  ResBody = ApiResponse,
  ReqBody = RequestBody,
  ReqQuery = RequestQuery,
> extends BaseRequest<P, ResBody, ReqBody, ReqQuery> {
  user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
  requestId?: string;
  files?: import('express-fileupload').FileArray | null;
}

// Re-export express types
export type Request<
  P = RequestParams,
  ResBody = ApiResponse<unknown>,
  ReqBody = unknown,
  ReqQuery = RequestQuery
> = BaseRequest<P, ResBody, ReqBody, ReqQuery>;

export type Response<ResBody = ApiResponse<unknown>> = BaseResponse<ResBody>;
export type NextFunction = BaseNextFunction;

// Handler types
export type HandlerResult<ResBody> = void | Promise<void | Response<ResBody>> | Response<ResBody>;

export type RequestHandler<
  P = RequestParams,
  ResBody = ApiResponse<unknown>,
  ReqBody = unknown,
  ReqQuery = RequestQuery
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => HandlerResult<ResBody>;

export type AuthenticatedRequestHandler<
  P = RequestParams,
  ResBody = ApiResponse,
  ReqBody = RequestBody,
  ReqQuery = RequestQuery
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => HandlerResult<ResBody>;

export type ErrorRequestHandler<
  P = RequestParams,
  ResBody = ApiResponse<unknown>,
  ReqBody = unknown,
  ReqQuery = RequestQuery
> = (
  err: Error,
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => HandlerResult<ResBody>;

export type JsonResponseBody<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Helper to create authenticated handlers
export function createAuthHandler<P, ResBody extends ApiResponse, ReqBody, ReqQuery>(
  handler: AuthenticatedRequestHandler<P, ResBody, ReqBody, ReqQuery>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      } as ResBody);
    }
    return handler(req as AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, res, next);
  };
}

// Declare module augmentations
declare module 'express' {
  interface Request {
    requestId?: string;
    user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
    files?: import('express-fileupload').FileArray | null;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AccessTokenPayloadDto | RefreshTokenPayloadDto;
    files?: import('express-fileupload').FileArray | null;
  }
}

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
