export interface BaseTokenPayloadDto {
    userId: string;
    username: string;
    role: string;
    is_active: boolean;
    permissions: string[];
}

export interface AccessTokenPayloadDto extends BaseTokenPayloadDto {
    type: 'access';
}

export interface RefreshTokenPayloadDto extends BaseTokenPayloadDto {
    type: 'refresh';
    tokenId: string;
}

export type TokenPayloadDto = AccessTokenPayloadDto | RefreshTokenPayloadDto;

// Re-export as TokenPayload for backward compatibility
export type TokenPayload = TokenPayloadDto;

export type TokenType = 'access' | 'refresh';

export interface TokenMetadata {
    type: TokenType;
    expiresIn: number;
    issuer: string;
    audience: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    metadata: {
        access: TokenMetadata;
        refresh: TokenMetadata;
    };
}
