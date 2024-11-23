import { FileSystemProvider, FileSystemCredentials, FileSystemType } from './types';
import { SFTPProvider } from './sftp.provider';
import { AgentSFTPProvider } from './agent.sftp.provider';
import { SMBProvider } from './smb.provider';
import { WebDAVProvider } from './webdav.provider';
import { RcloneProvider } from './rclone.provider';
import { Host } from '../../../types/host';
import { AgentService } from '../agent/agent.service';
import { Injectable } from '@nestjs/common';
import { FileSystemLocation, FileListResponse, Space, QuickAccessResponse } from '../../../types/filesystem';
import {
  CreateLocationDto,
  UpdateLocationDto,
} from '../../routes/filesystem/dto/location.dto';
import {
  ListFilesDto,
  CopyMoveDto,
  CreateDirectoryDto,
  DeleteFilesDto,
  SelectFilesDto,
  SearchFilesDto,
} from '../../routes/filesystem/dto/file-operations.dto';
import {
  CreateSpaceDto,
  UpdateSpaceDto,
} from '../../routes/filesystem/dto/space.dto';
import { Repository, InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { logger } from '../../../logger';
import { ApiError } from '../../../types/api-error';
import { sanitizePath, validateFile } from '../../utils/security';
import { LogMetadata } from '../../../types/logging';
import { FileItem } from '../../../types/models-shared';

@Injectable()
export class FileSystemManager {
  private activeConnections = new Map<string, FileSystemProvider>();
  private locations = new Map<string, FileSystemLocation>();

  constructor(
    private readonly agentService: AgentService,
    @InjectRepository(FileSystemLocation)
    private readonly locationRepository: Repository<FileSystemLocation>,
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>
  ) {}

  async createProvider(
    type: FileSystemType,
    credentials: FileSystemCredentials,
    host?: Host
  ): Promise<FileSystemProvider> {
    let provider: FileSystemProvider;

    switch (type) {
      case 'sftp':
        if (host) {
          try {
            const agentStatus = await this.agentService.getAgentStatus(host.id);
            if (agentStatus.connected) {
              provider = new AgentSFTPProvider(this.agentService, host);
              break;
            }
          } catch {}
        }
        provider = new SFTPProvider();
        break;

      case 'smb':
        provider = new SMBProvider();
        break;

      case 'webdav':
        provider = new WebDAVProvider();
        break;

      case 'rclone':
        provider = new RcloneProvider();
        break;

      default:
        throw new Error(`Unsupported filesystem type: ${type}`);
    }

    await provider.connect(credentials);
    
    // Store the connection with a unique key
    const connectionKey = this.getConnectionKey(type, credentials, host);
    this.activeConnections.set(connectionKey, provider);

    return provider;
  }

  async getProvider(
    type: FileSystemType,
    credentials: FileSystemCredentials,
    host?: Host
  ): Promise<FileSystemProvider> {
    const connectionKey = this.getConnectionKey(type, credentials, host);
    const existingProvider = this.activeConnections.get(connectionKey);

    if (existingProvider) {
      // Test the connection before returning
      try {
        if (await existingProvider.test?.()) {
          return existingProvider;
        }
      } catch {}

      // If test fails, remove the connection
      await this.closeConnection(connectionKey);
    }

    // Create new provider if none exists or test failed
    return this.createProvider(type, credentials, host);
  }

  async closeConnection(connectionKey: string): Promise<void> {
    const provider = this.activeConnections.get(connectionKey);
    if (provider) {
      await provider.disconnect();
      this.activeConnections.delete(connectionKey);
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.activeConnections.entries()).map(
      async ([key, provider]) => {
        await provider.disconnect();
        this.activeConnections.delete(key);
      }
    );

    await Promise.all(closePromises);
  }

  private getConnectionKey(
    type: FileSystemType,
    credentials: FileSystemCredentials,
    host?: Host
  ): string {
    if (host) {
      return `${type}:${host.id}`;
    }
    return `${type}:${credentials.host || ''}:${credentials.port || ''}:${
      credentials.username || ''
    }:${credentials.remoteName || ''}`;
  }

  // Location Management
  async listLocations(): Promise<FileSystemLocation[]> {
    return this.locationRepository.find();
  }

  async createLocation(dto: CreateLocationDto): Promise<FileSystemLocation> {
    const location = this.locationRepository.create({
      ...dto,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Test the connection before saving
    const provider = await this.createProvider(dto.type, dto.credentials, dto.hostId ? { id: dto.hostId } as Host : undefined);
    await provider.disconnect();

    return this.locationRepository.save(location);
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<FileSystemLocation> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }

    // Test the connection before updating
    const provider = await this.createProvider(
      dto.type || location.type,
      dto.credentials || location.credentials,
      dto.hostId ? { id: dto.hostId } as Host : undefined
    );
    await provider.disconnect();

    Object.assign(location, {
      ...dto,
      updatedAt: new Date()
    });

    return this.locationRepository.save(location);
  }

  async deleteLocation(id: string): Promise<void> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }

    // Close any active connections
    const connectionKey = this.getConnectionKey(
      location.type,
      location.credentials,
      location.hostId ? { id: location.hostId } as Host : undefined
    );
    await this.closeConnection(connectionKey);

    await this.locationRepository.remove(location);
  }

  private async getLocationById(id: string): Promise<FileSystemLocation> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }
    return location;
  }

  private async getProviderForLocation(locationId: string): Promise<FileSystemProvider> {
    const location = await this.getLocationById(locationId);
    return this.getProvider(
      location.type,
      location.credentials,
      location.hostId ? { id: location.hostId } as Host : undefined
    );
  }

  // File Operations
  async listFiles(locationId: string, dto: ListFilesDto): Promise<FileListResponse> {
    const provider = await this.getProviderForLocation(locationId);
    
    try {
      logger.info('Listing files', {
        locationId,
        path: dto.path,
        component: 'FileSystemManager'
      });

      const files = await provider.listFiles(dto.path);
      return {
        success: true,
        files: files.map(file => ({
          name: file.name,
          path: file.path,
          size: file.size,
          isDirectory: file.isDirectory,
          mode: file.mode,
          modTime: file.modTime,
          owner: file.owner,
          group: file.group
        }))
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        path: dto.path,
        component: 'FileSystemManager'
      };
      logger.error('Failed to list files:', metadata);
      throw new ApiError('Failed to list files', error, 500, metadata);
    }
  }

  async createDownloadStream(locationId: string, path: string): Promise<NodeJS.ReadableStream> {
    const provider = await this.getProviderForLocation(locationId);
    
    try {
      logger.info('Creating download stream', {
        locationId,
        path,
        component: 'FileSystemManager'
      });

      return await provider.createReadStream(path);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        path,
        component: 'FileSystemManager'
      };
      logger.error('Failed to create download stream:', metadata);
      throw new ApiError('Failed to create download stream', error, 500, metadata);
    }
  }

  async uploadFiles(locationId: string, path: string, files: Express.Multer.File[]): Promise<void> {
    const provider = await this.getProviderForLocation(locationId);
    const safePath = sanitizePath(path);

    try {
      logger.info('Starting file upload', {
        locationId,
        path: safePath,
        fileCount: files.length,
        component: 'FileSystemManager'
      });

      // Validate each file
      files.forEach(file => validateFile(file));

      // Upload files sequentially to prevent memory issues
      for (const file of files) {
        await provider.uploadFile(safePath, file);
        logger.info('File uploaded successfully', {
          locationId,
          path: safePath,
          filename: file.originalname,
          size: file.size,
          component: 'FileSystemManager'
        });
      }
    } catch (error) {
      logger.error('File upload failed', {
        locationId,
        path: safePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'FileSystemManager'
      });
      throw error;
    }
  }

  async copyFiles(locationId: string, dto: CopyMoveDto): Promise<void> {
    const provider = await this.getProviderForLocation(locationId);
    const safeSourcePath = sanitizePath(dto.sourcePath);
    const safeTargetPath = sanitizePath(dto.targetPath);

    try {
      logger.info('Starting file copy', {
        locationId,
        sourcePath: safeSourcePath,
        targetPath: safeTargetPath,
        component: 'FileSystemManager'
      });

      await provider.copyFile(safeSourcePath, dto.targetLocationId, safeTargetPath, {
        recursive: dto.recursive,
        overwrite: dto.overwrite
      });

      logger.info('File copy completed', {
        locationId,
        sourcePath: safeSourcePath,
        targetPath: safeTargetPath,
        component: 'FileSystemManager'
      });
    } catch (error) {
      logger.error('File copy failed', {
        locationId,
        sourcePath: safeSourcePath,
        targetPath: safeTargetPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'FileSystemManager'
      });
      throw error;
    }
  }

  async moveFiles(locationId: string, dto: CopyMoveDto): Promise<void> {
    const provider = await this.getProviderForLocation(locationId);
    const safeSourcePath = sanitizePath(dto.sourcePath);
    const safeTargetPath = sanitizePath(dto.targetPath);

    try {
      logger.info('Starting file move', {
        locationId,
        sourcePath: safeSourcePath,
        targetPath: safeTargetPath,
        component: 'FileSystemManager'
      });

      await provider.moveFile(safeSourcePath, dto.targetLocationId, safeTargetPath, {
        recursive: dto.recursive,
        overwrite: dto.overwrite
      });

      logger.info('File move completed', {
        locationId,
        sourcePath: safeSourcePath,
        targetPath: safeTargetPath,
        component: 'FileSystemManager'
      });
    } catch (error) {
      logger.error('File move failed', {
        locationId,
        sourcePath: safeSourcePath,
        targetPath: safeTargetPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'FileSystemManager'
      });
      throw error;
    }
  }

  async createDirectory(locationId: string, dto: CreateDirectoryDto): Promise<void> {
    const provider = await this.getProviderForLocation(locationId);
    
    try {
      logger.info('Creating directory', {
        locationId,
        path: dto.path,
        name: dto.name,
        component: 'FileSystemManager'
      });

      const dirPath = `${dto.path}/${dto.name}`;
      await provider.mkdir(dirPath);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        path: dto.path,
        name: dto.name,
        component: 'FileSystemManager'
      };
      logger.error('Failed to create directory:', metadata);
      throw new ApiError('Failed to create directory', error, 500, metadata);
    }
  }

  async deleteFiles(locationId: string, dto: DeleteFilesDto): Promise<void> {
    const provider = await this.getProviderForLocation(locationId);
    
    try {
      logger.info('Deleting files', {
        locationId,
        paths: dto.paths,
        component: 'FileSystemManager'
      });

      for (const path of dto.paths) {
        const stats = await provider.stat(path);
        if (stats.isDirectory) {
          await provider.rmdir(path, { recursive: true });
        } else {
          await provider.unlink(path);
        }
      }
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        paths: dto.paths,
        component: 'FileSystemManager'
      };
      logger.error('Failed to delete files:', metadata);
      throw new ApiError('Failed to delete files', error, 500, metadata);
    }
  }

  async searchFiles(locationId: string, dto: SearchFilesDto): Promise<FileListResponse> {
    const provider = await this.getProviderForLocation(locationId);
    
    try {
      logger.info('Searching files', {
        locationId,
        path: dto.path,
        query: dto.query,
        component: 'FileSystemManager'
      });

      const files = await provider.search(dto.path, dto.query);
      return {
        success: true,
        files: files.map(file => ({
          name: file.name,
          path: file.path,
          size: file.size,
          isDirectory: file.isDirectory,
          mode: file.mode,
          modTime: file.modTime,
          owner: file.owner,
          group: file.group
        }))
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        path: dto.path,
        query: dto.query,
        component: 'FileSystemManager'
      };
      logger.error('Failed to search files:', metadata);
      throw new ApiError('Failed to search files', error, 500, metadata);
    }
  }

  // Spaces Management
  async listSpaces(): Promise<Space[]> {
    try {
      logger.info('Listing spaces', {
        component: 'FileSystemManager'
      });

      return this.spaceRepository.find({
        order: {
          name: 'ASC'
        }
      });
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'FileSystemManager'
      };
      logger.error('Failed to list spaces:', metadata);
      throw new ApiError('Failed to list spaces', error, 500, metadata);
    }
  }

  async createSpace(dto: CreateSpaceDto): Promise<Space> {
    try {
      logger.info('Creating space', {
        name: dto.name,
        component: 'FileSystemManager'
      });

      const space = this.spaceRepository.create({
        ...dto,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return this.spaceRepository.save(space);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: dto.name,
        component: 'FileSystemManager'
      };
      logger.error('Failed to create space:', metadata);
      throw new ApiError('Failed to create space', error, 500, metadata);
    }
  }

  async updateSpace(id: string, dto: UpdateSpaceDto): Promise<Space> {
    try {
      logger.info('Updating space', {
        id,
        component: 'FileSystemManager'
      });

      const space = await this.spaceRepository.findOne({ where: { id } });
      if (!space) {
        throw new NotFoundException(`Space with id ${id} not found`);
      }

      Object.assign(space, {
        ...dto,
        updatedAt: new Date()
      });

      return this.spaceRepository.save(space);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        component: 'FileSystemManager'
      };
      logger.error('Failed to update space:', metadata);
      throw new ApiError('Failed to update space', error, 500, metadata);
    }
  }

  async deleteSpace(id: string): Promise<void> {
    try {
      logger.info('Deleting space', {
        id,
        component: 'FileSystemManager'
      });

      const space = await this.spaceRepository.findOne({ where: { id } });
      if (!space) {
        throw new NotFoundException(`Space with id ${id} not found`);
      }

      await this.spaceRepository.remove(space);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        component: 'FileSystemManager'
      };
      logger.error('Failed to delete space:', metadata);
      throw new ApiError('Failed to delete space', error, 500, metadata);
    }
  }

  // Quick Access
  async getQuickAccess(): Promise<QuickAccessResponse> {
    try {
      logger.info('Getting quick access', {
        component: 'FileSystemManager'
      });

      // Get recent files from database
      const recentFiles = await this.locationRepository
        .createQueryBuilder('location')
        .orderBy('location.lastAccessed', 'DESC')
        .limit(10)
        .getMany();

      // Get favorites from database
      const favorites = await this.locationRepository
        .createQueryBuilder('location')
        .where('location.isFavorite = :isFavorite', { isFavorite: true })
        .orderBy('location.name', 'ASC')
        .getMany();

      return {
        recent: recentFiles.map(file => ({
          locationId: file.id,
          path: file.path,
          name: file.name,
          lastAccessed: file.lastAccessed
        })),
        favorites: favorites.map(file => ({
          locationId: file.id,
          path: file.path,
          name: file.name,
          lastAccessed: file.lastAccessed
        }))
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        component: 'FileSystemManager'
      };
      logger.error('Failed to get quick access:', metadata);
      throw new ApiError('Failed to get quick access', error, 500, metadata);
    }
  }

  async addToFavorites(locationId: string, path: string): Promise<void> {
    try {
      logger.info('Adding to favorites', {
        locationId,
        path,
        component: 'FileSystemManager'
      });

      const location = await this.locationRepository.findOne({ where: { id: locationId } });
      if (!location) {
        throw new NotFoundException(`Location with id ${locationId} not found`);
      }

      location.isFavorite = true;
      location.lastAccessed = new Date();
      await this.locationRepository.save(location);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        path,
        component: 'FileSystemManager'
      };
      logger.error('Failed to add to favorites:', metadata);
      throw new ApiError('Failed to add to favorites', error, 500, metadata);
    }
  }

  async removeFromFavorites(locationId: string, path: string): Promise<void> {
    try {
      logger.info('Removing from favorites', {
        locationId,
        path,
        component: 'FileSystemManager'
      });

      const location = await this.locationRepository.findOne({ where: { id: locationId } });
      if (!location) {
        throw new NotFoundException(`Location with id ${locationId} not found`);
      }

      location.isFavorite = false;
      await this.locationRepository.save(location);
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        locationId,
        path,
        component: 'FileSystemManager'
      };
      logger.error('Failed to remove from favorites:', metadata);
      throw new ApiError('Failed to remove from favorites', error, 500, metadata);
    }
  }

  async selectFiles(dto: SelectFilesDto): Promise<FileListResponse> {
    try {
      logger.info('Selecting files', {
        paths: dto.paths,
        component: 'FileSystemManager'
      });

      const files: FileItem[] = [];
      for (const path of dto.paths) {
        const location = await this.locationRepository.findOne({ where: { path } });
        if (location) {
          const provider = await this.getProviderForLocation(location.id);
          const stats = await provider.stat(path);
          files.push({
            name: path.split('/').pop() || '',
            path,
            size: stats.size,
            isDirectory: stats.isDirectory,
            mode: stats.mode,
            modTime: stats.modTime,
            owner: stats.owner,
            group: stats.group
          });
        }
      }

      return {
        success: true,
        files
      };
    } catch (error) {
      const metadata: LogMetadata = {
        error: error instanceof Error ? error.message : 'Unknown error',
        paths: dto.paths,
        component: 'FileSystemManager'
      };
      logger.error('Failed to select files:', metadata);
      throw new ApiError('Failed to select files', error, 500, metadata);
    }
  }
}
