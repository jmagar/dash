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
    BadRequestException,
    UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import { join } from 'path';
import * as archiver from 'archiver';
import rateLimit from 'express-rate-limit';
import { ValidationPipe } from '@nestjs/common';

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
import * as mime from 'mime-types';

// Rate limiter for share access
const shareAccessLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many share access attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

@Controller('shares')
@ApiTags('File Sharing')
export class SharingController {
    constructor(
        private readonly sharingService: SharingService,
        private readonly filesystemService: FilesystemService
    ) {}

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiOperation({ summary: 'Create a new file share' })
    @ApiResponse({ status: 201, type: ShareInfoDto })
    async createShare(
        @Body() dto: CreateShareRequestDto,
        @Req() req: Request
    ): Promise<ShareInfoDto> {
        try {
            return await this.sharingService.createShare(dto, req);
        } catch (error) {
            logger.error('Failed to create share', {
                error: error.message,
                path: dto.path,
                userId: req.user?.id
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Post(':shareId/access')
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiOperation({ summary: 'Access a shared file' })
    @ApiResponse({ status: 200, type: ShareInfoDto })
    async accessShare(
        @Param('shareId') shareId: string,
        @Body() dto: ShareAccessRequestDto,
        @Req() req: Request
    ): Promise<ShareInfoDto> {
        try {
            dto.shareId = shareId;
            return await this.sharingService.accessShare(dto, req);
        } catch (error) {
            logger.error('Failed to access share', {
                error: error.message,
                shareId,
                userId: req.user?.id
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Get(':shareId/download')
    @ApiOperation({ summary: 'Download a shared file' })
    async downloadShare(
        @Param('shareId') shareId: string,
        @Query('password') password: string,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        try {
            const dto: ShareAccessRequestDto = { shareId, password };
            const share = await this.sharingService.accessShare(dto, req);

            // Validate CSRF token for downloads if enabled
            if (share.security?.csrfProtection) {
                const csrfToken = req.get('x-csrf-token');
                if (!csrfToken || csrfToken !== share.csrfToken) {
                    throw new UnauthorizedException('Invalid CSRF token');
                }
            }

            // Set security headers
            res.setHeader('Content-Security-Policy', "default-src 'self'");
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');

            const filePath = share.path;
            const fileName = path.basename(filePath);

            if (share.allowZipDownload && (await this.filesystemService.isDirectory(filePath))) {
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}.zip"`);

                const zipStream = await this.filesystemService.createZipStream(filePath);
                zipStream.pipe(res);
            } else {
                const stat = await this.filesystemService.stat(filePath);
                const contentType = mime.lookup(filePath) || 'application/octet-stream';

                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Length', stat.size);
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

                const fileStream = await this.filesystemService.createReadStream(filePath);
                fileStream.pipe(res);
            }
        } catch (error) {
            logger.error('Failed to download share', {
                error: error.message,
                shareId,
                userId: req.user?.id
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Put(':shareId')
    @UseGuards(AuthGuard('jwt'))
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiOperation({ summary: 'Modify share settings' })
    @ApiResponse({ status: 200, type: ShareInfoDto })
    async modifyShare(
        @Param('shareId') shareId: string,
        @Body() dto: ModifyShareRequestDto,
        @Req() req: Request
    ): Promise<ShareInfoDto> {
        try {
            dto.shareId = shareId;
            return await this.sharingService.modifyShare(dto);
        } catch (error) {
            logger.error('Failed to modify share', {
                error: error.message,
                shareId,
                userId: req.user?.id
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Delete(':shareId')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Revoke share' })
    async revokeShare(
        @Param('shareId') shareId: string,
        @Body() dto: RevokeShareRequestDto,
        @Req() req: Request
    ): Promise<void> {
        try {
            dto.shareId = shareId;
            await this.sharingService.revokeShare(dto);
        } catch (error) {
            logger.error('Failed to revoke share', {
                error: error.message,
                shareId,
                userId: req.user?.id
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @UsePipes(new ValidationPipe({ transform: true }))
    @ApiOperation({ summary: 'List shares' })
    @ApiResponse({ status: 200, type: ListSharesResponseDto })
    async listShares(
        @Query() dto: ListSharesRequestDto,
        @Req() req: Request
    ): Promise<ListSharesResponseDto> {
        try {
            return await this.sharingService.listShares(dto);
        } catch (error) {
            logger.error('Failed to list shares', {
                error: error.message,
                userId: req.user?.id
            });
            errorAggregator.trackError(error);
            throw error;
        }
    }
}
