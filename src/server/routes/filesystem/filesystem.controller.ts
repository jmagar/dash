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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
  async createLocation(@Body() dto: CreateLocationDto): Promise<FileSystemLocation> {
    return this.filesystemManager.createLocation(dto);
  }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Update a filesystem location' })
  @ApiResponse({ status: 200, type: FileSystemLocation })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto
  ): Promise<FileSystemLocation> {
    return this.filesystemManager.updateLocation(id, dto);
  }

  @Delete('locations/:id')
  @ApiOperation({ summary: 'Delete a filesystem location' })
  @ApiResponse({ status: 204 })
  async deleteLocation(@Param('id') id: string): Promise<void> {
    await this.filesystemManager.deleteLocation(id);
  }

  /**
   * File Operations
   */
  @Get(':locationId/files')
  @ApiOperation({ summary: 'List files in a directory' })
  @ApiResponse({ status: 200, type: FileListResponse })
  async listFiles(
    @Param('locationId') locationId: string,
    @Query() dto: ListFilesDto
  ): Promise<FileListResponse> {
    return this.filesystemManager.listFiles(locationId, dto);
  }

  @Get(':locationId/files/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, type: StreamableFile })
  async downloadFile(
    @Param('locationId') locationId: string,
    @Query('path') path: string
  ): Promise<StreamableFile> {
    const stream = await this.filesystemManager.createDownloadStream(locationId, path);
    return new StreamableFile(stream);
  }

  @Post(':locationId/files/upload')
  @ApiOperation({ summary: 'Upload files' })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @Param('locationId') locationId: string,
    @Body() dto: UploadFilesDto,
    @UploadedFiles() files: Express.Multer.File[]
  ): Promise<void> {
    if (!files?.length) {
      throw new BadRequestException('No files provided');
    }
    await this.filesystemManager.uploadFiles(locationId, dto.path, files);
  }

  @Post(':locationId/files/copy')
  @ApiOperation({ summary: 'Copy files/directories' })
  async copyFiles(
    @Param('locationId') locationId: string,
    @Body() dto: CopyMoveDto
  ): Promise<void> {
    await this.filesystemManager.copyFiles(locationId, dto);
  }

  @Post(':locationId/files/move')
  @ApiOperation({ summary: 'Move files/directories' })
  async moveFiles(
    @Param('locationId') locationId: string,
    @Body() dto: CopyMoveDto
  ): Promise<void> {
    await this.filesystemManager.moveFiles(locationId, dto);
  }

  @Post(':locationId/files/mkdir')
  @ApiOperation({ summary: 'Create a directory' })
  async createDirectory(
    @Param('locationId') locationId: string,
    @Body() dto: CreateDirectoryDto
  ): Promise<void> {
    await this.filesystemManager.createDirectory(locationId, dto);
  }

  @Post(':locationId/files/delete')
  @ApiOperation({ summary: 'Delete files/directories' })
  async deleteFiles(
    @Param('locationId') locationId: string,
    @Body() dto: DeleteFilesDto
  ): Promise<void> {
    await this.filesystemManager.deleteFiles(locationId, dto);
  }

  @Post(':locationId/files/search')
  @ApiOperation({ summary: 'Search for files' })
  async searchFiles(
    @Param('locationId') locationId: string,
    @Body() dto: SearchFilesDto
  ): Promise<FileListResponse> {
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
  async createSpace(@Body() dto: CreateSpaceDto): Promise<Space> {
    return this.filesystemManager.createSpace(dto);
  }

  @Put('spaces/:id')
  @ApiOperation({ summary: 'Update a space' })
  @ApiResponse({ status: 200, type: Space })
  async updateSpace(
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto
  ): Promise<Space> {
    return this.filesystemManager.updateSpace(id, dto);
  }

  @Delete('spaces/:id')
  @ApiOperation({ summary: 'Delete a space' })
  @ApiResponse({ status: 204 })
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

  @Post('quick-access/favorites')
  @ApiOperation({ summary: 'Add item to favorites' })
  async addToFavorites(
    @Body('locationId') locationId: string,
    @Body('path') path: string
  ): Promise<void> {
    await this.filesystemManager.addToFavorites(locationId, path);
  }

  @Delete('quick-access/favorites')
  @ApiOperation({ summary: 'Remove item from favorites' })
  async removeFromFavorites(
    @Body('locationId') locationId: string,
    @Body('path') path: string
  ): Promise<void> {
    await this.filesystemManager.removeFromFavorites(locationId, path);
  }

  /**
   * File Selection
   */
  @Post('select')
  @ApiOperation({ summary: 'Open file selector' })
  async openFileSelector(@Body() dto: SelectFilesDto): Promise<FileListResponse> {
    return this.filesystemManager.selectFiles(dto);
  }
}
