import { 
    Controller, 
    Get, 
    Post, 
    Put, 
    Delete, 
    Body, 
    Param, 
    Query, 
    UseGuards, 
    UsePipes, 
    ValidationPipe, 
    Req, 
    Res, 
    HttpException,
    UnauthorizedException,
    BadRequestException,
    CanActivate,
    Type,
    ExecutionContext,
    StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response, ParamsDictionary } from 'express-serve-static-core';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Archiver, create } from 'archiver';
import { rateLimit, MemoryStore, Options as RateLimitOptions } from 'express-rate-limit';
import { lookup } from 'mime-types';
import { Readable } from 'stream';
import type { ParsedQs } from 'qs';

import type { 
    ISharingService, 
    IShareRequest,
    IShareResponse,
} from '../interfaces/sharing.interface';
import type { IFilesystemService } from '../interfaces/filesystem.interface';
import { AuthGuard } from '@nestjs/passport';
import {
    CreateShareRequestDto,
    ShareAccessRequestDto,
    ModifyShareRequestDto,
    RevokeShareRequestDto,
    ListSharesRequestDto,
    ListSharesResponseDto,
    ShareAccessType,
    ShareInfoDto,
    ShareSecurityDto,
} from '../dto/sharing.dto';

interface FileStats {
    size: number;
}

interface RateLimitMiddleware {
    (req: IShareRequest, res: Response, next: () => void): void;
}

interface ArchiverOptions {
    zlib: {
        level: number;
    };
}

class TypedRateLimiter implements CanActivate {
    private readonly middleware: RateLimitMiddleware;

    constructor(windowMs: number, max: number) {
        const options: RateLimitOptions = {
            windowMs,
            max,
            standardHeaders: true,
            legacyHeaders: false,
            message: 'Too many requests, please try again later.',
            statusCode: 429,
            skip: () => false,
            requestPropertyName: 'rateLimit',
            skipFailedRequests: false,
            skipSuccessfulRequests: false,
            keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
            handler: (req, res) => {
                res.status(429).json({
                    message: 'Too many requests, please try again later.',
                });
            },
            limit: max,
            requestWasSuccessful: (_req, res) => res.statusCode < 400,
            store: new MemoryStore(),
            validate: true,  // Enable validation of options
        };
        this.middleware = rateLimit(options) as RateLimitMiddleware;
    }

    canActivate(context: ExecutionContext): Promise<boolean> {
        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<IShareRequest>();
        const response = httpContext.getResponse<Response>();

        return new Promise<boolean>((resolve) => {
            this.middleware(request, response, () => resolve(true));
        });
    }
}

class RateLimiterGuard extends TypedRateLimiter {
    constructor(windowMs: number, max: number) {
        super(windowMs, max);
    }
}

const createRateLimiterGuard = (windowMs: number, max: number): Type<CanActivate> => {
    return class extends RateLimiterGuard {
        constructor() {
            super(windowMs, max);
        }
    };
};

class ArchiverWrapper {
    private readonly instance: Archiver;

    constructor() {
        const options: ArchiverOptions = {
            zlib: { level: 9 }
        };

        const instance = create('zip', options);
        if (!this.isValidInstance(instance)) {
            throw new Error('Failed to create archiver instance');
        }

        this.instance = instance;
    }

    pipe(destination: NodeJS.WritableStream): this {
        if (!this.isValidInstance(this.instance)) {
            throw new Error('Invalid archiver instance');
        }
        const pipedStream = this.instance.pipe(destination);
        if (!pipedStream) {
            throw new Error('Failed to pipe archiver stream');
        }
        return this;
    }

    directory(dirpath: string, destpath: string): this {
        if (!this.isValidInstance(this.instance)) {
            throw new Error('Invalid archiver instance');
        }
        const result = this.instance.directory(dirpath, destpath);
        if (!result) {
            throw new Error('Failed to add directory to archive');
        }
        return this;
    }

    async finalize(): Promise<void> {
        if (!this.isValidInstance(this.instance)) {
            throw new Error('Invalid archiver instance');
        }
        await this.instance.finalize();
    }

    private isValidInstance(instance: unknown): instance is Archiver {
        if (!instance || typeof instance !== 'object') {
            return false;
        }

        const archiver = instance as Archiver;
        return typeof archiver.pipe === 'function' &&
               typeof archiver.directory === 'function' &&
               typeof archiver.finalize === 'function';
    }
}

const createZipArchiver = (): ArchiverWrapper => {
    return new ArchiverWrapper();
};

@Controller('shares')
@ApiTags('File Sharing')
@UseGuards(AuthGuard('jwt'))
@UsePipes(new ValidationPipe({ transform: true }))
export class SharingController {
    constructor(
        private readonly sharingService: ISharingService,
        private readonly filesystemService: IFilesystemService
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a new share' })
    @ApiResponse({ status: 201, description: 'Share created successfully', type: ShareInfoDto })
    async createShare(
        @Body() dto: CreateShareRequestDto,
        @Req() req: IShareRequest
    ): Promise<ShareInfoDto> {
        try {
            if (!req.user?.userId) {
                throw new UnauthorizedException('User not authenticated');
            }
            return await this.sharingService.createShare(dto, req);
        } catch (error) {
            if (error instanceof Error) {
                throw new HttpException(error.message, error instanceof HttpException ? error.getStatus() : 500);
            }
            throw new HttpException('Internal server error', 500);
        }
    }

    @Post(':shareId/access')
    @ApiOperation({ summary: 'Access a share' })
    @ApiResponse({ status: 200, description: 'Share accessed successfully', type: ShareInfoDto })
    async accessShare(
        @Param('shareId') shareId: string,
        @Body() dto: ShareAccessRequestDto,
        @Req() req: IShareRequest
    ): Promise<ShareInfoDto> {
        try {
            if (!req.user?.userId) {
                throw new UnauthorizedException('User not authenticated');
            }
            const accessRequest = { ...dto, shareId };
            return await this.sharingService.accessShare(accessRequest, req);
        } catch (error) {
            if (error instanceof Error) {
                throw new HttpException(error.message, error instanceof HttpException ? error.getStatus() : 500);
            }
            throw new HttpException('Internal server error', 500);
        }
    }

    @Get(':shareId/download')
    @ApiOperation({ summary: 'Download shared files' })
    @ApiResponse({ status: 200, description: 'File downloaded successfully' })
    async downloadShare(
        @Param('shareId') shareId: string,
        @Query('password') password: string,
        @Req() req: IShareRequest,
        @Res() res: Response
    ): Promise<void> {
        try {
            if (!req.user?.userId) {
                throw new UnauthorizedException('User not authenticated');
            }

            const share = await this.sharingService.getShare(shareId);
            if (!share || !share.path) {
                throw new BadRequestException('Share not found or invalid');
            }

            const isDirectory = await this.filesystemService.isDirectory(share.path);
            if (isDirectory && !share.allowZipDownload) {
                throw new BadRequestException('Directory download not allowed');
            }

            if (isDirectory) {
                const zipArchiver = createZipArchiver();
                const filename = share.path.split('/').pop() || 'download';
                
                res.attachment(`${filename}.zip`);
                zipArchiver.pipe(res);
                zipArchiver.directory(share.path, filename);
                await zipArchiver.finalize();
            } else {
                const readStream = await this.filesystemService.createReadStream(share.path);
                if (!(readStream instanceof Readable)) {
                    throw new Error('Invalid read stream');
                }

                const stats = await this.filesystemService.stat(share.path) as FileStats;
                const filename = share.path.split('/').pop() || 'download';
                const mimeType = lookup(filename);
                if (typeof mimeType !== 'string') {
                    throw new Error('Invalid mime type');
                }

                res.set({
                    'Content-Type': mimeType || 'application/octet-stream',
                    'Content-Length': stats.size,
                    'Content-Disposition': `attachment; filename="${filename}"`,
                });

                readStream.pipe(res);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new HttpException(error.message, error instanceof HttpException ? error.getStatus() : 500);
            }
            throw new HttpException('Internal server error', 500);
        }
    }

    @Put(':shareId')
    @ApiOperation({ summary: 'Modify a share' })
    @ApiResponse({ status: 200, description: 'Share modified successfully', type: ShareInfoDto })
    @UseGuards(createRateLimiterGuard(60000, 10))
    async modifyShare(
        @Param('shareId') shareId: string,
        @Body() dto: ModifyShareRequestDto,
        @Req() req: IShareRequest
    ): Promise<ShareInfoDto> {
        try {
            if (!req.user?.userId) {
                throw new UnauthorizedException('User not authenticated');
            }
            return await this.sharingService.modifyShare(dto);
        } catch (error) {
            if (error instanceof Error) {
                throw new HttpException(error.message, error instanceof HttpException ? error.getStatus() : 500);
            }
            throw new HttpException('Internal server error', 500);
        }
    }

    @Delete(':shareId')
    @ApiOperation({ summary: 'Revoke a share' })
    @ApiResponse({ status: 200, description: 'Share revoked successfully' })
    @UseGuards(createRateLimiterGuard(60000, 10))
    async revokeShare(
        @Param('shareId') shareId: string,
        @Body() dto: RevokeShareRequestDto,
        @Req() req: IShareRequest
    ): Promise<void> {
        try {
            if (!req.user?.userId) {
                throw new UnauthorizedException('User not authenticated');
            }
            await this.sharingService.revokeShare(dto);
        } catch (error) {
            if (error instanceof Error) {
                throw new HttpException(error.message, error instanceof HttpException ? error.getStatus() : 500);
            }
            throw new HttpException('Internal server error', 500);
        }
    }

    @Get()
    @ApiOperation({ summary: 'List all shares' })
    @ApiResponse({ status: 200, description: 'List of shares', type: ListSharesResponseDto })
    @UseGuards(createRateLimiterGuard(60000, 30))
    async listShares(
        @Query() dto: ListSharesRequestDto,
        @Req() req: IShareRequest
    ): Promise<ListSharesResponseDto> {
        try {
            if (!req.user?.userId) {
                throw new UnauthorizedException('User not authenticated');
            }
            return await this.sharingService.listShares(dto);
        } catch (error) {
            if (error instanceof Error) {
                throw new HttpException(error.message, error instanceof HttpException ? error.getStatus() : 500);
            }
            throw new HttpException('Internal server error', 500);
        }
    }
}
