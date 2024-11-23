import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Request } from 'express';
import { normalize, resolve } from 'path';
import { Cache } from 'cache-manager';
import sanitize from 'sanitize-filename';

import {
    CreateShareRequestDto,
    ShareInfoDto,
    ShareAccessRequestDto,
    ModifyShareRequestDto,
    RevokeShareRequestDto,
    ListSharesRequestDto,
    ListSharesResponseDto,
    ShareStatus,
    ShareAccessType,
    ShareAccessLogEntryDto
} from '../dto/sharing.dto';
import { FileShare } from '../entities/file-share.entity';
import { ShareAccessLog } from '../entities/share-access-log.entity';
import { FilesystemService } from './filesystem.service';
import { logger } from '../../../utils/logger';
import { errorAggregator } from '../../../services/errorAggregator';

const CACHE_TTL = 5 * 60; // 5 minutes
const SHARE_INFO_PREFIX = 'share_info:';
const SHARE_LIST_PREFIX = 'share_list:';

@Injectable()
export class SharingService {
    constructor(
        @InjectRepository(FileShare)
        private shareRepository: Repository<FileShare>,
        @InjectRepository(ShareAccessLog)
        private accessLogRepository: Repository<ShareAccessLog>,
        private filesystemService: FilesystemService,
        private configService: ConfigService,
        private cacheManager: Cache
    ) {}

    private async getCachedShareInfo(shareId: string): Promise<ShareInfoDto | null> {
        return this.cacheManager.get<ShareInfoDto>(`${SHARE_INFO_PREFIX}${shareId}`);
    }

    private async setCachedShareInfo(shareId: string, info: ShareInfoDto): Promise<void> {
        await this.cacheManager.set(`${SHARE_INFO_PREFIX}${shareId}`, info, CACHE_TTL);
    }

    private async invalidateShareCache(shareId: string): Promise<void> {
        await this.cacheManager.del(`${SHARE_INFO_PREFIX}${shareId}`);
    }

    async createShare(dto: CreateShareRequestDto): Promise<ShareInfoDto> {
        try {
            // Sanitize and validate path
            const sanitizedPath = this.sanitizePath(dto.path);
            if (!await this.filesystemService.exists(sanitizedPath)) {
                throw new NotFoundException(`File not found: ${dto.path}`);
            }

            const share = this.shareRepository.create({
                id: this.generateShareId(),
                path: sanitizedPath,
                accessType: dto.accessType,
                status: ShareStatus.ACTIVE,
                expiresAt: dto.expiresAt,
                maxAccesses: dto.maxAccesses,
                allowZipDownload: dto.allowZipDownload,
                metadata: dto.metadata,
                passwordHash: dto.password ? await this.hashPassword(dto.password) : null
            });

            const savedShare = await this.shareRepository.save(share);
            const shareInfo = this.mapShareToDto(savedShare);
            await this.setCachedShareInfo(share.id, shareInfo);

            logger.info('Share created:', {
                shareId: share.id,
                path: sanitizedPath,
                accessType: dto.accessType,
            });

            return shareInfo;
        } catch (error) {
            errorAggregator.trackError(error);
            throw error;
        }
    }

    async verifyShareAccess(shareId: string, req: Request, password?: string): Promise<void> {
        try {
            // Check cache first
            const cachedShare = await this.getCachedShareInfo(shareId);
            const share = cachedShare || await this.shareRepository.findOne({ 
                where: { id: shareId }
            });
            
            if (!share) {
                throw new NotFoundException('Share not found');
            }

            if (share.status !== ShareStatus.ACTIVE) {
                throw new UnauthorizedException('Share is not active');
            }

            if (share.expiresAt && share.expiresAt < new Date()) {
                share.status = ShareStatus.EXPIRED;
                await Promise.all([
                    this.shareRepository.save(share),
                    this.invalidateShareCache(shareId)
                ]);
                throw new UnauthorizedException('Share has expired');
            }

            if (share.maxAccesses && share.accessCount >= share.maxAccesses) {
                throw new UnauthorizedException('Maximum access count reached');
            }

            if (share.passwordHash) {
                if (!password) {
                    throw new UnauthorizedException('Password required');
                }
                if (!await this.verifyPassword(password, share.passwordHash)) {
                    // Log failed password attempts
                    logger.warn('Failed share password attempt:', {
                        shareId,
                        ip: req.ip,
                        userAgent: req.headers['user-agent'],
                    });
                    throw new UnauthorizedException('Invalid password');
                }
            }

            const log = this.accessLogRepository.create({
                shareId,
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || 'Unknown',
                status: 'success'
            });

            await Promise.all([
                this.accessLogRepository.save(log),
                this.shareRepository.update(shareId, {
                    accessCount: () => '"accessCount" + 1',
                    lastAccessedAt: new Date()
                })
            ]);

            // Update cache with new access count
            if (cachedShare) {
                cachedShare.accessCount = (cachedShare.accessCount || 0) + 1;
                cachedShare.lastAccessedAt = new Date();
                await this.setCachedShareInfo(shareId, cachedShare);
            }

            logger.info('Share accessed:', {
                shareId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });
        } catch (error) {
            // Log access failure
            const log = this.accessLogRepository.create({
                shareId,
                timestamp: new Date(),
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || 'Unknown',
                status: 'failure',
                errorMessage: error.message
            });
            await this.accessLogRepository.save(log);

            errorAggregator.trackError(error);
            throw error;
        }
    }

    private sanitizePath(path: string): string {
        // Normalize path and prevent directory traversal
        const normalizedPath = normalize(path).replace(/^(\.\.[\/\\])+/, '');
        const parts = normalizedPath.split(/[\/\\]/);
        const sanitizedParts = parts.map(part => sanitize(part));
        return resolve(sanitizedParts.join('/'));
    }

    private generateShareId(): string {
        return crypto.randomBytes(16).toString('hex');
    }

    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 12); // Increased from 10 to 12 rounds
    }

    private async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    private generateShareUrl(shareId: string): string {
        const baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
        return `${baseUrl}/share/${shareId}`;
    }

    private mapShareToDto(share: FileShare): ShareInfoDto {
        return {
            id: share.id,
            url: this.generateShareUrl(share.id),
            path: share.path,
            accessType: share.accessType,
            status: share.status,
            createdAt: share.createdAt,
            expiresAt: share.expiresAt,
            lastAccessedAt: share.lastAccessedAt,
            accessCount: share.accessCount,
            maxAccesses: share.maxAccesses,
            allowZipDownload: share.allowZipDownload,
            hasPassword: !!share.passwordHash,
            metadata: share.metadata
        };
    }

    async getShareInfo(shareId: string): Promise<ShareInfoDto> {
        try {
            // Check cache first
            const cachedShare = await this.getCachedShareInfo(shareId);
            if (cachedShare) {
                return cachedShare;
            }

            const share = await this.shareRepository.findOne({ 
                where: { id: shareId }
            });

            if (!share) {
                throw new NotFoundException(`Share not found: ${shareId}`);
            }

            const shareInfo = this.mapShareToDto(share);
            await this.setCachedShareInfo(shareId, shareInfo);
            
            return shareInfo;
        } catch (error) {
            errorAggregator.trackError(error);
            throw error;
        }
    }

    async modifyShare(dto: ModifyShareRequestDto): Promise<ShareInfoDto> {
        try {
            const share = await this.shareRepository.findOne({ 
                where: { id: dto.shareId }
            });

            if (!share) {
                throw new NotFoundException(`Share not found: ${dto.shareId}`);
            }

            Object.assign(share, {
                ...(dto.accessType && { accessType: dto.accessType }),
                ...(dto.expiresAt && { expiresAt: dto.expiresAt }),
                ...(dto.maxAccesses && { maxAccesses: dto.maxAccesses }),
                ...(dto.allowZipDownload !== undefined && { allowZipDownload: dto.allowZipDownload }),
                ...(dto.metadata && { metadata: { ...share.metadata, ...dto.metadata } }),
                ...(dto.password && { passwordHash: await this.hashPassword(dto.password) })
            });

            const savedShare = await this.shareRepository.save(share);
            const shareInfo = this.mapShareToDto(savedShare);
            await this.setCachedShareInfo(share.id, shareInfo);

            logger.info('Share modified:', {
                shareId: share.id,
                accessType: share.accessType,
                expiresAt: share.expiresAt,
                maxAccesses: share.maxAccesses,
                allowZipDownload: share.allowZipDownload,
                metadata: share.metadata
            });

            return shareInfo;
        } catch (error) {
            errorAggregator.trackError(error);
            throw error;
        }
    }

    async revokeShare(dto: RevokeShareRequestDto): Promise<void> {
        try {
            const result = await this.shareRepository.update(
                { id: dto.shareId, status: ShareStatus.ACTIVE },
                {
                    status: ShareStatus.REVOKED,
                    metadata: () => `jsonb_set(metadata, '{revocation}', '${JSON.stringify({
                        reason: dto.reason,
                        timestamp: new Date()
                    })}')`
                }
            );

            if (result.affected === 0) {
                throw new NotFoundException(`Share not found or already revoked: ${dto.shareId}`);
            }

            await this.invalidateShareCache(dto.shareId);

            logger.info('Share revoked:', {
                shareId: dto.shareId,
                reason: dto.reason
            });
        } catch (error) {
            errorAggregator.trackError(error);
            throw error;
        }
    }

    async listShares(dto: ListSharesRequestDto): Promise<ListSharesResponseDto> {
        try {
            const queryBuilder = this.shareRepository.createQueryBuilder('share');

            if (dto.path) {
                queryBuilder.andWhere('share.path = :path', { path: dto.path });
            }

            if (dto.status) {
                queryBuilder.andWhere('share.status = :status', { status: dto.status });
            }

            if (dto.accessType) {
                queryBuilder.andWhere('share.accessType = :accessType', { accessType: dto.accessType });
            }

            if (!dto.includeExpired) {
                queryBuilder.andWhere('(share.expiresAt IS NULL OR share.expiresAt > :now)', { now: new Date() });
            }

            const [shares, total] = await queryBuilder
                .orderBy('share.createdAt', 'DESC')
                .getManyAndCount();

            let accessLogs: ShareAccessLogEntryDto[] = [];
            if (dto.includeAccessLogs && shares.length > 0) {
                accessLogs = await this.accessLogRepository.find({
                    where: { shareId: { $in: shares.map(s => s.id) } },
                    order: { timestamp: 'DESC' }
                });
            }

            const cachedShares = await Promise.all(shares.map(share => this.getCachedShareInfo(share.id)));
            const shareInfos = shares.map((share, index) => this.mapShareToDto(share));

            await Promise.all(cachedShares.map((cachedShare, index) => {
                if (!cachedShare) {
                    return this.setCachedShareInfo(shares[index].id, shareInfos[index]);
                }
                return Promise.resolve();
            }));

            return {
                shares: shareInfos,
                total,
                accessLogs
            };
        } catch (error) {
            errorAggregator.trackError(error);
            throw error;
        }
    }
}
