import { Controller, Get, Post, Delete, Param, Body, Inject, Req } from '@nestjs/common';
import { z } from 'zod';
import { ApiError } from '../../../types/error';
import { FileSystemEntryDto } from './dto/filesystem-entry.dto';
import { FileSystemStatsDto } from './dto/filesystem-stats.dto';
import { Request } from 'express';
import { FileSystemOperationsService } from '../../services/filesystem/filesystem-operations.service';
import { PathValidationService } from '../../services/filesystem/path-validator.service';
import { AccessTokenPayloadDto } from '../../../types/auth';

// Custom request type with proper user payload
interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayloadDto;
}

// Validation schemas
const pathParamsSchema = z.object({
  hostId: z.string(),
  path: z.string().optional()
});

const createDirectorySchema = z.object({
  path: z.string(),
  recursive: z.boolean().optional()
});

const moveFileSchema = z.object({
  sourcePath: z.string(),
  destinationPath: z.string()
});

const writeFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.string().optional()
});

@Controller('filesystem')
export class FileSystemController {
  constructor(
    @Inject(FileSystemOperationsService)
    private readonly fileSystemOperations: FileSystemOperationsService,
    @Inject(PathValidationService)
    private readonly pathValidator: PathValidationService
  ) {}

  @Get('/:hostId/*')
  async listDirectory(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Param('*') path?: string
  ): Promise<FileSystemEntryDto[]> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    const normalizedPath = path || '/';
    
    try {
      const validatedParams = pathParamsSchema.parse({ hostId, path: normalizedPath });
      return await this.fileSystemOperations.listDirectory(
        req.user.userId,
        hostId,
        validatedParams.path || '/'
      );
    } catch (error) {
      throw new ApiError('Failed to list directory', error instanceof Error ? error : undefined, 500);
    }
  }

  @Get('/:hostId/stats/*')
  async getStats(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Param('*') path?: string
  ): Promise<FileSystemStatsDto> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    const normalizedPath = path || '/';
    
    try {
      const validatedParams = pathParamsSchema.parse({ hostId, path: normalizedPath });
      return await this.fileSystemOperations.getStats(
        req.user.userId,
        hostId,
        validatedParams.path || '/'
      );
    } catch (error) {
      throw new ApiError('Failed to get file stats', error instanceof Error ? error : undefined, 500);
    }
  }

  @Post('/:hostId/directory')
  async createDirectory(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Body() body: { path: string, recursive?: boolean }
  ): Promise<void> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    try {
      const validatedBody = createDirectorySchema.parse(body);
      await this.fileSystemOperations.createDirectory(
        req.user.userId,
        hostId,
        validatedBody.path,
        validatedBody.recursive
      );
    } catch (error) {
      throw new ApiError('Failed to create directory', error instanceof Error ? error : undefined, 500);
    }
  }

  @Delete('/:hostId/*')
  async deleteFile(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Param('*') path: string
  ): Promise<void> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    if (!path) {
      throw new ApiError('Path is required', undefined, 400);
    }
    
    try {
      const validatedParams = pathParamsSchema.parse({ hostId, path });
      await this.fileSystemOperations.delete(
        req.user.userId,
        hostId,
        validatedParams.path || '/'
      );
    } catch (error) {
      throw new ApiError('Failed to delete file', error instanceof Error ? error : undefined, 500);
    }
  }

  @Post('/:hostId/move')
  async moveFile(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Body() body: { sourcePath: string, destinationPath: string }
  ): Promise<void> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    try {
      const validatedBody = moveFileSchema.parse(body);
      await this.fileSystemOperations.move(
        req.user.userId,
        hostId,
        validatedBody.sourcePath,
        validatedBody.destinationPath
      );
    } catch (error) {
      throw new ApiError('Failed to move file', error instanceof Error ? error : undefined, 500);
    }
  }

  @Post('/:hostId/write')
  async writeFile(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Body() body: { path: string, content: string, encoding?: string }
  ): Promise<void> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    try {
      const validatedBody = writeFileSchema.parse(body);
      await this.fileSystemOperations.writeFile(
        req.user.userId,
        hostId,
        validatedBody.path,
        validatedBody.content,
        validatedBody.encoding as BufferEncoding
      );
    } catch (error) {
      throw new ApiError('Failed to write file', error instanceof Error ? error : undefined, 500);
    }
  }

  @Get('/:hostId/read/*')
  async readFile(
    @Req() req: AuthenticatedRequest,
    @Param('hostId') hostId: string,
    @Param('*') path: string
  ): Promise<string> {
    if (!req.user?.userId) throw new ApiError('Unauthorized', undefined, 401);
    
    if (!path) {
      throw new ApiError('Path is required', undefined, 400);
    }
    
    try {
      const validatedParams = pathParamsSchema.parse({ hostId, path });
      return await this.fileSystemOperations.readFile(
        req.user.userId,
        hostId,
        validatedParams.path || '/'
      );
    } catch (error) {
      throw new ApiError('Failed to read file', error instanceof Error ? error : undefined, 500);
    }
  }
}
