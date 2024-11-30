import type { Request } from 'express';
import type { AccessTokenPayloadDto } from '../../../../types/auth';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { 
    ShareSecurityDto, 
    ShareAccessType, 
    ShareSortBy, 
    SortOrder,
    CreateShareRequestDto,
    ShareInfoDto,
    ShareAccessRequestDto,
    ModifyShareRequestDto,
    RevokeShareRequestDto,
    ListSharesRequestDto,
    ListSharesResponseDto,
} from '../dto/sharing.dto';

// Request with authenticated user - only allow access tokens, not refresh tokens
export interface IShareRequest extends Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>> {
    user?: AccessTokenPayloadDto;  // Restrict to access tokens only
}

// Type aliases for DTO types to maintain consistent naming
export type IShareResponse = ShareInfoDto;
export type ICreateShareRequest = CreateShareRequestDto;
export type IModifyShareRequest = ModifyShareRequestDto;
export type IShareAccessRequest = ShareAccessRequestDto;
export type IRevokeShareRequest = RevokeShareRequestDto;
export type IListSharesRequest = ListSharesRequestDto;
export type IListSharesResponse = ListSharesResponseDto;

// Service interface
export interface ISharingService {
    createShare(request: CreateShareRequestDto, req: IShareRequest): Promise<ShareInfoDto>;
    accessShare(request: ShareAccessRequestDto, req: IShareRequest): Promise<ShareInfoDto>;
    modifyShare(request: ModifyShareRequestDto): Promise<ShareInfoDto>;
    revokeShare(request: RevokeShareRequestDto): Promise<void>;
    listShares(request: ListSharesRequestDto): Promise<ListSharesResponseDto>;
    getShare(shareId: string): Promise<ShareInfoDto | null>;
}

// Re-export enums and types for convenience
export {
    ShareAccessType,
    ShareSortBy,
    SortOrder,
    ShareSecurityDto,
};
