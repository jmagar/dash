import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  StreamableFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FileSystemManager } from '../../services/filesystem/filesystem.manager';
import { FileSystemLocation, FileListResponse, Space, QuickAccessResponse } from '../../../types/filesystem';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/location.dto';
import {
  ListFilesDto,
  UploadFilesDto,
  CopyMoveDto,
  CreateDirectoryDto,
  DeleteFilesDto,
  SelectFilesDto,
  SearchFilesDto,
} from './dto/file-operations.dto';
import {
  CreateSpaceDto,
  UpdateSpaceDto,
} from './dto/space.dto';
import { FavoriteItemDto } from './dto/favorites.dto';
import { FilePathDto } from './dto/file-path.dto';

@ApiTags('Filesystem')
@Controller('api/fs')
export class FilesystemController {
  constructor(private readonly filesystemManager: FileSystemManager) {}

  /**
   * Location Management
   */
  @Get('locations')
  @ApiOperation({ summary: 'List all filesystem locations' })
  @ApiResponse({ status: 200, type: [FileSystemLocation] })
  async listLocations(): Promise<FileSystemLocation[]> {
    return this.filesystemManager.listLocations();
  }

  @Post('locations')
  @ApiOperation({ summary: 'Create a new filesystem location' })
  @ApiResponse({ status: 201, type: FileSystemLocation })
  @ApiBody({ type: CreateLocationDto })
  async createLocation(@Body() dto: CreateLocationDto): Promise<FileSystemLocation> {
    return this.filesystemManager.createLocation(dto);
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Update a filesystem location' })
  @ApiResponse({ status: 200, type: FileSystemLocation })
  @ApiParam({ name: 'id', description: 'Location ID' })
  @ApiBody({ type: UpdateLocationDto })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto
  ): Promise<FileSystemLocation> {
    return this.filesystemManager.updateLocation(id, dto);
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Delete a filesystem location' })
  @ApiResponse({ status: 204 })
  @ApiParam({ name: 'id', description: 'Location ID' })
  async deleteLocation(@Param('id') id: string): Promise<void> {
    await this.filesystemManager.deleteLocation(id);
  }

  /**
   * File Operations
   */
  @Get(':locationId/files')
  @ApiOperation({ summary: 'List files in a directory' })
  @ApiResponse({ status: 200, type: FileListResponse })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiQuery({ type: ListFilesDto })
  async listFiles(
    @Param('locationId') locationId: string,
    @Query() dto: ListFilesDto
  ): Promise<FileListResponse> {
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    return this.filesystemManager.listFiles(locationId, dto);
  }

  @Get(':locationId/download')
  @ApiOperation({ summary: 'Download a file' })
  async downloadFile(
    @Param('locationId') locationId: string,
    @Query() dto: FilePathDto
  ): Promise<StreamableFile> {
    if (!locationId || !dto.path) {
      throw new BadRequestException('Both locationId and path are required');
    }
    const stream = await this.filesystemManager.createDownloadStream(locationId, dto.path);
    return new StreamableFile(stream);
  }

  @Post(':locationId/files/upload')
  @ApiOperation({ summary: 'Upload files' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @Param('locationId') locationId: string,
    @Body() dto: UploadFilesDto,
    @UploadedFiles() files: Express.Multer.File[]
  ): Promise<void> {
    if (!files?.length) {
      throw new BadRequestException('No files provided for upload');
    }
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    await this.filesystemManager.uploadFiles(locationId, dto.path, files);
  }

  @Post(':locationId/files/copy')
  @ApiOperation({ summary: 'Copy files/directories' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiBody({ type: CopyMoveDto })
  async copyFiles(
    @Param('locationId') locationId: string,
    @Body() dto: CopyMoveDto
  ): Promise<void> {
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    if (locationId === dto.targetLocationId && dto.sourcePath === dto.targetPath) {
      throw new BadRequestException('Source and target paths cannot be the same');
    }
    await this.filesystemManager.copyFiles(locationId, dto);
  }

  @Post(':locationId/files/move')
  @ApiOperation({ summary: 'Move files/directories' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiBody({ type: CopyMoveDto })
  async moveFiles(
    @Param('locationId') locationId: string,
    @Body() dto: CopyMoveDto
  ): Promise<void> {
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    if (locationId === dto.targetLocationId && dto.sourcePath === dto.targetPath) {
      throw new BadRequestException('Source and target paths cannot be the same');
    }
    await this.filesystemManager.moveFiles(locationId, dto);
  }

  @Post(':locationId/files/mkdir')
  @ApiOperation({ summary: 'Create a directory' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiBody({ type: CreateDirectoryDto })
  async createDirectory(
    @Param('locationId') locationId: string,
    @Body() dto: CreateDirectoryDto
  ): Promise<void> {
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    await this.filesystemManager.createDirectory(locationId, dto);
  }

  @Post(':locationId/files/delete')
  @ApiOperation({ summary: 'Delete files/directories' })
  @ApiResponse({ status: 201 })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiBody({ type: DeleteFilesDto })
  async deleteFiles(
    @Param('locationId') locationId: string,
    @Body() dto: DeleteFilesDto
  ): Promise<void> {
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    await this.filesystemManager.deleteFiles(locationId, dto);
  }

  @Post(':locationId/files/search')
  @ApiOperation({ summary: 'Search for files' })
  @ApiResponse({ status: 200, type: FileListResponse })
  @ApiParam({ name: 'locationId', description: 'Location ID' })
  @ApiBody({ type: SearchFilesDto })
  async searchFiles(
    @Param('locationId') locationId: string,
    @Body() dto: SearchFilesDto
  ): Promise<FileListResponse> {
    if (!locationId) {
      throw new BadRequestException('Location ID is required');
    }
    return this.filesystemManager.searchFiles(locationId, dto);
  }

  /**
   * Spaces Management
   */
  @Get('spaces')
  @ApiOperation({ summary: 'List all spaces' })
  @ApiResponse({ status: 200, type: [Space] })
  async listSpaces(): Promise<Space[]> {
    return this.filesystemManager.listSpaces();
  }

  @Post('spaces')
  @ApiOperation({ summary: 'Create a new space' })
  @ApiResponse({ status: 201, type: Space })
  @ApiBody({ type: CreateSpaceDto })
  async createSpace(@Body() dto: CreateSpaceDto): Promise<Space> {
    return this.filesystemManager.createSpace(dto);
  }

  @Put('spaces/:id')
  @ApiOperation({ summary: 'Update a space' })
  @ApiResponse({ status: 200, type: Space })
  @ApiParam({ name: 'id', description: 'Space ID' })
  @ApiBody({ type: UpdateSpaceDto })
  async updateSpace(
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto
  ): Promise<Space> {
    return this.filesystemManager.updateSpace(id, dto);
  }

  @Delete('spaces/:id')
  @ApiOperation({ summary: 'Delete a space' })
  @ApiResponse({ status: 204 })
  @ApiParam({ name: 'id', description: 'Space ID' })
  async deleteSpace(@Param('id') id: string): Promise<void> {
    await this.filesystemManager.deleteSpace(id);
  }

  /**
   * Quick Access
   */
  @Get('quick-access')
  @ApiOperation({ summary: 'Get quick access items' })
  @ApiResponse({ status: 200, type: QuickAccessResponse })
  async getQuickAccess(): Promise<QuickAccessResponse> {
    return this.filesystemManager.getQuickAccess();
  }

  @Post(':locationId/favorites/add')
  @ApiOperation({ summary: 'Add a file or directory to favorites' })
  async addToFavorites(@Body() dto: FavoriteItemDto): Promise<void> {
    if (!dto.locationId || !dto.path) {
      throw new BadRequestException('Both locationId and path are required');
    }
    await this.filesystemManager.addToFavorites(dto.locationId, dto.path);
  }

  @Post(':locationId/favorites/remove')
  @ApiOperation({ summary: 'Remove a file or directory from favorites' })
  async removeFromFavorites(@Body() dto: FavoriteItemDto): Promise<void> {
    if (!dto.locationId || !dto.path) {
      throw new BadRequestException('Both locationId and path are required');
    }
    await this.filesystemManager.removeFromFavorites(dto.locationId, dto.path);
  }

  /**
   * File Selection
   */
  @Post('select')
  @ApiOperation({ summary: 'Open file selector' })
  @ApiResponse({ status: 200, type: FileListResponse })
  @ApiBody({ type: SelectFilesDto })
  async openFileSelector(@Body() dto: SelectFilesDto): Promise<FileListResponse> {
    return this.filesystemManager.selectFiles(dto);
  }
}
