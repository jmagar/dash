import { Repository, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest } from 'express';
import sanitizeFilename from 'sanitize-filename';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { normalize, resolve } from 'path';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

import { FileShare } from '../entities/file-share.entity';
import { ShareAccessLog } from '../entities/share-access-log.entity';
import { LoggingManager } from '../../../managers/LoggingManager';
import { 
    ShareInfoDto, 
    ShareAccessLogEntryDto, 
    ShareStatus, 
    ShareAccessType,
    CreateShareRequestDto,
    ModifyShareRequestDto,
    RevokeShareRequestDto,
    ListSharesRequestDto,
    ListSharesResponseDto,
    ShareSecurityDto
} from '../dto/sharing.dto';

const SHARE_INFO_PREFIX = 'share:';
const CSRF_TOKEN_PREFIX = 'csrf:';
const CACHE_TTL = 3600; // 1 hour
const SALT_ROUNDS = 10;

interface ShareSecurity {
    rateLimit?: {
        maxRequests: number;
        windowMinutes: number;
    };
    ipAllowlist?: string[];
    ipDenylist?: string[];
    referrerAllowlist?: string[];
    referrerDenylist?: string[];
    csrfProtection?: boolean;
}

type TypedRequest = ExpressRequest & {
    headers: {
        'x-csrf-token'?: string;
        referer?: string;
    };
    ip: string;
};

interface CacheManager {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, ttl: number): Promise<void>;
    del(key: string): Promise<void>;
}

function isShareSecurity(obj: unknown): obj is ShareSecurity {
    if (!obj || typeof obj !== 'object') return false;
    const security = obj as ShareSecurity;
    
    if (security.rateLimit) {
        if (typeof security.rateLimit.maxRequests !== 'number' || 
            typeof security.rateLimit.windowMinutes !== 'number') {
            return false;
        }
    }
    
    if (security.ipAllowlist && !Array.isArray(security.ipAllowlist)) return false;
    if (security.ipDenylist && !Array.isArray(security.ipDenylist)) return false;
    if (security.referrerAllowlist && !Array.isArray(security.referrerAllowlist)) return false;
    if (security.referrerDenylist && !Array.isArray(security.referrerDenylist)) return false;
    if (security.csrfProtection && typeof security.csrfProtection !== 'boolean') return false;
    
    return true;
}

export class SharingService {
    private readonly rateLimiters: Map<string, RateLimiterMemory>;
    private readonly cache: CacheManager;
    private readonly logger: LoggingManager;

    constructor(
        private readonly shareRepository: Repository<FileShare>,
        private readonly accessLogRepository: Repository<ShareAccessLog>,
        private readonly cacheManager: CacheManager,
        private readonly configService: ConfigService
    ) {
        this.rateLimiters = new Map<string, RateLimiterMemory>();
        this.cache = this.cacheManager;
        this.logger = LoggingManager.getInstance();
    }

    private async validateSecurity(
        share: FileShare,
        req: TypedRequest
    ): Promise<{ isValid: boolean; error?: string }> {
        const security = share.security;
        if (!security || !isShareSecurity(security)) {
            return { isValid: true };
        }

        // Rate limit check
        if (security.rateLimit) {
            try {
                const limiter = this.getRateLimiter(share);
                await limiter.consume(req.ip);
            } catch (error) {
                return {
                    isValid: false,
                    error: 'Rate limit exceeded'
                };
            }
        }

        // IP allowlist check
        if (security.ipAllowlist?.length) {
            if (!security.ipAllowlist.includes(req.ip)) {
                return {
                    isValid: false,
                    error: 'IP address not allowed'
                };
            }
        }

        // IP denylist check
        if (security.ipDenylist?.length) {
            if (security.ipDenylist.includes(req.ip)) {
                return {
                    isValid: false,
                    error: 'IP address blocked'
                };
            }
        }

        // Referrer check
        if (security.referrerAllowlist?.length) {
            const referrer = req.headers.referer;
            if (!referrer || !security.referrerAllowlist.some(r => referrer.startsWith(r))) {
                return {
                    isValid: false,
                    error: 'Invalid referrer'
                };
            }
        }

        // CSRF protection
        if (security.csrfProtection) {
            const token = await this.getCachedCsrfToken(share.id);
            const providedToken = req.headers['x-csrf-token'];

            if (!token || !providedToken || token !== providedToken) {
                return {
                    isValid: false,
                    error: 'Invalid CSRF token'
                };
            }
        }

        return { isValid: true };
    }

    private getRateLimiter(share: FileShare): RateLimiterMemory {
        const security = share.security;
        if (!security || !isShareSecurity(security) || !security.rateLimit) {
            throw new Error('Rate limit configuration not found');
        }

        const { maxRequests, windowMinutes } = security.rateLimit;
        const key = `rate-limiter:${share.id}`;
        let limiter = this.rateLimiters.get(key);

        if (!limiter) {
            limiter = new RateLimiterMemory({
                points: maxRequests,
                duration: windowMinutes * 60,
                keyPrefix: key
            });
            this.rateLimiters.set(key, limiter);
        }

        return limiter;
    }

    private async getCachedShareInfo(shareId: string): Promise<ShareInfoDto | null> {
        const key = `${SHARE_INFO_PREFIX}${shareId}`;
        try {
            const result = await this.cache.get<ShareInfoDto>(key);
            return result ?? null;
        } catch (error) {
            this.logger.error('Failed to get cached share info', {
                shareId,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    private async setCachedShareInfo(shareId: string, info: ShareInfoDto): Promise<void> {
        const key = `${SHARE_INFO_PREFIX}${shareId}`;
        try {
            await this.cache.set<ShareInfoDto>(key, info, CACHE_TTL);
        } catch (error) {
            this.logger.error('Failed to set cached share info', {
                shareId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async getCachedCsrfToken(shareId: string): Promise<string | null> {
        const key = `${CSRF_TOKEN_PREFIX}${shareId}`;
        try {
            const result = await this.cache.get<string>(key);
            return result ?? null;
        } catch (error) {
            this.logger.error('Failed to get cached CSRF token', {
                shareId,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    private async setCachedCsrfToken(shareId: string, token: string): Promise<void> {
        const key = `${CSRF_TOKEN_PREFIX}${shareId}`;
        try {
            await this.cache.set<string>(key, token, CACHE_TTL);
        } catch (error) {
            this.logger.error('Failed to set cached CSRF token', {
                shareId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private async invalidateShareCache(shareId: string): Promise<void> {
        const key = `${SHARE_INFO_PREFIX}${shareId}`;
        try {
            await this.cache.del(key);
        } catch (error) {
            this.logger.error('Failed to invalidate share cache', {
                shareId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    async createShare(req: CreateShareRequestDto): Promise<ShareInfoDto> {
        const share = new FileShare();
        share.path = sanitizeFilename(req.path);
        share.accessType = req.accessType;
        share.allowZipDownload = req.allowZipDownload ?? false;
        share.metadata = req.metadata;

        if (req.security) {
            const security: ShareSecurity = {
                csrfProtection: req.security.csrfProtection ?? false
            };

            if (req.security.password) {
                share.passwordHash = await this.hashPassword(req.security.password);
            }

            if (req.security.expiresIn) {
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + req.security.expiresIn);
                share.expiresAt = expiresAt;
            }

            if (security.csrfProtection) {
                share.csrfToken = randomBytes(32).toString('hex');
                await this.setCachedCsrfToken(share.id, share.csrfToken);
            }

            share.security = security;
        }

        try {
            const savedShare = await this.shareRepository.save(share);
            const shareInfo = this.toShareInfoDto(savedShare);
            await this.setCachedShareInfo(savedShare.id, shareInfo);
            return shareInfo;
        } catch (error) {
            throw this.handleError(error as Error);
        }
    }

    async modifyShare(req: ModifyShareRequestDto): Promise<ShareInfoDto> {
        const share = await this.shareRepository.findOne({ where: { id: req.shareId } });
        if (!share) {
            throw new Error('Share not found');
        }

        share.allowZipDownload = req.allowZipDownload ?? share.allowZipDownload;
        share.metadata = req.metadata ?? share.metadata;

        if (req.security) {
            const existingSecurity = share.security && isShareSecurity(share.security) ? share.security : {};
            const security: ShareSecurity = {
                ...existingSecurity,
                csrfProtection: req.security.csrfProtection ?? false
            };

            if (req.security.password) {
                share.passwordHash = await this.hashPassword(req.security.password);
            }

            if (req.security.expiresIn) {
                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + req.security.expiresIn);
                share.expiresAt = expiresAt;
            }

            if (security.csrfProtection && !share.csrfToken) {
                share.csrfToken = randomBytes(32).toString('hex');
                await this.setCachedCsrfToken(share.id, share.csrfToken);
            }

            share.security = security;
        }

        try {
            const savedShare = await this.shareRepository.save(share);
            const shareInfo = this.toShareInfoDto(savedShare);
            await this.setCachedShareInfo(savedShare.id, shareInfo);
            return shareInfo;
        } catch (error) {
            throw this.handleError(error as Error);
        }
    }

    async listShares(req: ListSharesRequestDto): Promise<ListSharesResponseDto> {
        const where: FindOptionsWhere<FileShare> = {};

        if (req.path) {
            where.path = req.path;
        }

        if (!req.includeExpired) {
            where.status = ShareStatus.ACTIVE;
        }

        try {
            const [shares, total] = await this.shareRepository.findAndCount({
                where,
                skip: req.offset,
                take: req.limit,
                order: {
                    [req.sortBy ?? 'createdAt']: req.sortOrder ?? 'DESC'
                }
            });

            const items = await Promise.all(shares.map(share => this.toShareInfoDto(share)));

            return {
                items,
                total,
                offset: req.offset ?? 0,
                limit: req.limit ?? 20
            };
        } catch (error) {
            throw this.handleError(error as Error);
        }
    }

    private handleError(error: Error): Error {
        this.logger.error('Sharing service error', {
            error: error.message,
            stack: error.stack
        });
        
        return new Error('Internal server error');
    }

    private toShareInfoDto(share: FileShare): ShareInfoDto {
        const baseUrl = this.configService.get<string>('BASE_URL', '');
        const shareUrl = baseUrl ? `${baseUrl}/share/${share.id}` : `/share/${share.id}`;

        const shareInfo: ShareInfoDto = {
            id: share.id,
            path: share.path,
            accessType: share.accessType,
            status: share.status,
            url: shareUrl,
            allowZipDownload: share.allowZipDownload ?? false,
            security: {
                csrfProtection: (share.security && isShareSecurity(share.security)) ? 
                    share.security.csrfProtection ?? false : false
            },
            csrfToken: share.csrfToken,
            createdAt: share.createdAt,
            expiresAt: share.expiresAt,
            createdBy: 'system', // TODO: Add user context
            accessCount: share.accessCount ?? 0,
            lastAccessedAt: share.lastAccessedAt,
            hasPassword: Boolean(share.passwordHash),
            metadata: share.metadata ?? {}
        };

        return shareInfo;
    }

    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }
}
