import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
    StreamableFile,
    BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import * as archiver from 'archiver';
import rateLimit from 'express-rate-limit';

import { SharingService } from '../services/sharing.service';
import { FilesystemService } from '../services/filesystem.service';
import { AuthGuard } from '@nestjs/passport';
import {
    CreateShareRequestDto,
    ShareInfoDto,
    ShareAccessRequestDto,
    ModifyShareRequestDto,
    RevokeShareRequestDto,
    ListSharesRequestDto,
    ListSharesResponseDto
} from '../dto/sharing.dto';
import { logger } from '../../../utils/logger';
import { errorAggregator } from '../../../services/errorAggregator';
import { validateRequest } from '../../../middleware/validation';
import { z } from 'zod';

// Rate limiter for share access
const shareAccessLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many share access attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

@Controller('api/shares')
@ApiTags('File Sharing')
export class SharingController {
    constructor(
        private readonly sharingService: SharingService,
        private readonly filesystemService: FilesystemService
    ) {}

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Create a new file share' })
    @ApiResponse({ status: 201, type: ShareInfoDto })
    async createShare(@Body() dto: CreateShareRequestDto): Promise<ShareInfoDto> {
        try {
            return await this.sharingService.createShare(dto);
        } catch (error) {
            logger.error('Failed to create share:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                path: dto.path,
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Get(':id')
    @UseGuards(shareAccessLimiter)
    @ApiOperation({ summary: 'Get share information' })
    @ApiParam({ name: 'id', description: 'Share ID' })
    @ApiResponse({ status: 200, type: ShareInfoDto })
    async getShareInfo(@Param('id') id: string): Promise<ShareInfoDto> {
        try {
            return await this.sharingService.getShareInfo(id);
        } catch (error) {
            logger.error('Failed to get share info:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                shareId: id,
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Get(':id/download')
    @UseGuards(shareAccessLimiter)
    @ApiOperation({ summary: 'Download shared file' })
    @ApiParam({ name: 'id', description: 'Share ID' })
    @ApiQuery({ name: 'password', required: false })
    async downloadSharedFile(
        @Param('id') id: string,
        @Query('password') password: string,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        try {
            // Verify share access
            await this.sharingService.verifyShareAccess(id, req, password);

            // Get share info
            const share = await this.sharingService.getShareInfo(id);
            const stats = await this.filesystemService.getStats(share.path);

            if (stats.isDirectory() && !share.allowZipDownload) {
                throw new BadRequestException('Directory download not allowed for this share');
            }

            // Set response headers with content security policy
            const filename = share.path.split('/').pop();
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
            res.setHeader('X-Content-Type-Options', 'nosniff');

            if (stats.isDirectory()) {
                // Create zip archive for directory with progress tracking
                const archive = archiver('zip', { zlib: { level: 9 } });
                res.setHeader('Content-Type', 'application/zip');
                
                let totalSize = 0;
                archive.on('entry', (entry) => {
                    totalSize += entry.size;
                    logger.debug('Archiving file:', {
                        filename: entry.name,
                        size: entry.size,
                        totalSize,
                        shareId: id,
                    });
                });

                archive.pipe(res);
                archive.directory(share.path, false);
                await archive.finalize();
            } else {
                // Stream single file with proper content type
                const mimeType = await this.filesystemService.getMimeType(share.path);
                const fileStream = createReadStream(share.path);
                res.setHeader('Content-Type', mimeType);
                fileStream.pipe(res);

                // Log download completion
                fileStream.on('end', () => {
                    logger.info('File download completed:', {
                        shareId: id,
                        path: share.path,
                        size: stats.size,
                    });
                });
            }
        } catch (error) {
            logger.error('Failed to download shared file:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                shareId: id,
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Modify share settings' })
    @ApiParam({ name: 'id', description: 'Share ID' })
    @ApiResponse({ status: 200, type: ShareInfoDto })
    async modifyShare(
        @Param('id') id: string,
        @Body() dto: ModifyShareRequestDto
    ): Promise<ShareInfoDto> {
        try {
            dto.shareId = id;
            return await this.sharingService.modifyShare(dto);
        } catch (error) {
            logger.error('Failed to modify share:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                shareId: id,
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Revoke share' })
    @ApiParam({ name: 'id', description: 'Share ID' })
    async revokeShare(
        @Param('id') id: string,
        @Body() dto: RevokeShareRequestDto
    ): Promise<void> {
        try {
            dto.shareId = id;
            await this.sharingService.revokeShare(dto);
        } catch (error) {
            logger.error('Failed to revoke share:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                shareId: id,
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'List shares' })
    @ApiResponse({ status: 200, type: ListSharesResponseDto })
    async listShares(@Query() dto: ListSharesRequestDto): Promise<ListSharesResponseDto> {
        try {
            return await this.sharingService.listShares(dto);
        } catch (error) {
            logger.error('Failed to list shares:', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }
}
