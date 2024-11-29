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
import { Repository } from '@nestjs/typeorm';
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
    private readonly locationRepository: Repository<FileSystemLocation>,
    private readonly spaceRepository: Repository<Space>
  ) {}

  async createProvider(
    type: FileSystemType,
    credentials: FileSystemCredentials,
    host?: Host
  ): Promise<FileSystemProvider> {
    try {
      let provider: FileSystemProvider;

      switch (type) {
        case 'sftp':
          if (host && host.agentId) {
            provider = new AgentSFTPProvider(this.agentService, host);
          } else {
            provider = new SFTPProvider();
          }
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
      return provider;
    } catch (error) {
      logger.error('Failed to create filesystem provider', {
        error,
        type,
        host: host?.id,
      });
      throw error;
    }
  }

  async getProvider(locationId: string): Promise<FileSystemProvider> {
    const provider = this.activeConnections.get(locationId);
    if (provider) {
      return provider;
    }

    const location = await this.locationRepository.findOne({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundException(`Location not found: ${locationId}`);
    }

    const host = location.hostId ? await this.agentService.getAgent(location.hostId) : undefined;
    const provider = await this.createProvider(location.type, location.credentials, host);
    this.activeConnections.set(locationId, provider);
    return provider;
  }

  async listFiles(locationId: string, dto: ListFilesDto): Promise<FileListResponse> {
    const provider = await this.getProvider(locationId);
    const path = sanitizePath(dto.path);

    try {
      const files = await provider.listFiles(path);
      return {
        path,
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
      logger.error('Failed to list files', {
        error,
        locationId,
        path,
      });
      throw error;
    }
  }

  async readFile(locationId: string, path: string): Promise<NodeJS.ReadableStream> {
    const provider = await this.getProvider(locationId);
    path = sanitizePath(path);

    try {
      const buffer = await provider.readFile(path);
      return buffer;
    } catch (error) {
      logger.error('Failed to read file', {
        error,
        locationId,
        path,
      });
      throw error;
    }
  }

  async writeFile(locationId: string, path: string, file: Express.Multer.File): Promise<void> {
    const provider = await this.getProvider(locationId);
    path = sanitizePath(path);

    try {
      await validateFile(file);
      await provider.writeFile(path, file.buffer);
    } catch (error) {
      logger.error('Failed to write file', {
        error,
        locationId,
        path,
      });
      throw error;
    }
  }

  async copyFile(locationId: string, dto: CopyMoveDto): Promise<void> {
    const provider = await this.getProvider(locationId);
    const sourcePath = sanitizePath(dto.sourcePath);
    const targetPath = sanitizePath(dto.targetPath);

    try {
      await provider.copyFile(sourcePath, targetPath);
    } catch (error) {
      logger.error('Failed to copy file', {
        error,
        locationId,
        sourcePath,
        targetPath,
      });
      throw error;
    }
  }

  async moveFile(locationId: string, dto: CopyMoveDto): Promise<void> {
    const provider = await this.getProvider(locationId);
    const sourcePath = sanitizePath(dto.sourcePath);
    const targetPath = sanitizePath(dto.targetPath);

    try {
      await provider.moveFile(sourcePath, targetPath);
    } catch (error) {
      logger.error('Failed to move file', {
        error,
        locationId,
        sourcePath,
        targetPath,
      });
      throw error;
    }
  }

  async createDirectory(locationId: string, dto: CreateDirectoryDto): Promise<void> {
    const provider = await this.getProvider(locationId);
    const path = sanitizePath(dto.path);

    try {
      await provider.mkdir(path);
    } catch (error) {
      logger.error('Failed to create directory', {
        error,
        locationId,
        path,
      });
      throw error;
    }
  }

  async deleteFiles(locationId: string, dto: DeleteFilesDto): Promise<void> {
    const provider = await this.getProvider(locationId);

    try {
      for (const path of dto.paths) {
        const sanitizedPath = sanitizePath(path);
        const stats = await provider.stat(sanitizedPath);

        if (stats.isDirectory) {
          await provider.rmdir(sanitizedPath);
        } else {
          await provider.unlink(sanitizedPath);
        }
      }
    } catch (error) {
      logger.error('Failed to delete files', {
        error,
        locationId,
        paths: dto.paths,
      });
      throw error;
    }
  }

  async searchFiles(locationId: string, dto: SearchFilesDto): Promise<FileListResponse> {
    const provider = await this.getProvider(locationId);
    const path = sanitizePath(dto.path);

    try {
      const searchResults = await provider.search(path, dto.query);
      return {
        path,
        files: searchResults.map(file => ({
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
      logger.error('Failed to search files', {
        error,
        locationId,
        path,
        query: dto.query,
      });
      throw error;
    }
  }

  async createLocation(dto: CreateLocationDto): Promise<FileSystemLocation> {
    try {
      const location = this.locationRepository.create({
        id: randomUUID(),
        name: dto.name,
        type: dto.type,
        path: dto.path,
        credentials: dto.credentials,
        hostId: dto.hostId,
      });

      await this.locationRepository.save(location);
      return location;
    } catch (error) {
      logger.error('Failed to create location', {
        error,
        name: dto.name,
        type: dto.type,
      });
      throw error;
    }
  }

  async updateLocation(id: string, dto: UpdateLocationDto): Promise<FileSystemLocation> {
    try {
      const location = await this.locationRepository.findOne({ where: { id } });
      if (!location) {
        throw new NotFoundException(`Location not found: ${id}`);
      }

      Object.assign(location, {
        name: dto.name,
        path: dto.path,
        credentials: dto.credentials,
        hostId: dto.hostId,
      });

      await this.locationRepository.save(location);
      return location;
    } catch (error) {
      logger.error('Failed to update location', {
        error,
        id,
      });
      throw error;
    }
  }

  async deleteLocation(id: string): Promise<void> {
    try {
      const location = await this.locationRepository.findOne({ where: { id } });
      if (!location) {
        throw new NotFoundException(`Location not found: ${id}`);
      }

      const provider = this.activeConnections.get(id);
      if (provider) {
        await provider.disconnect();
        this.activeConnections.delete(id);
      }

      await this.locationRepository.remove(location);
    } catch (error) {
      logger.error('Failed to delete location', {
        error,
        id,
      });
      throw error;
    }
  }

  async getLocation(id: string): Promise<FileSystemLocation> {
    const location = await this.locationRepository.findOne({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Location not found: ${id}`);
    }
    return location;
  }

  async getLocations(): Promise<FileSystemLocation[]> {
    return this.locationRepository.find();
  }

  async createSpace(dto: CreateSpaceDto): Promise<Space> {
    try {
      const space = this.spaceRepository.create({
        id: randomUUID(),
        name: dto.name,
        description: dto.description,
        locations: dto.locationIds.map(id => ({ id })),
      });

      await this.spaceRepository.save(space);
      return space;
    } catch (error) {
      logger.error('Failed to create space', {
        error,
        name: dto.name,
      });
      throw error;
    }
  }

  async updateSpace(id: string, dto: UpdateSpaceDto): Promise<Space> {
    try {
      const space = await this.spaceRepository.findOne({ where: { id } });
      if (!space) {
        throw new NotFoundException(`Space not found: ${id}`);
      }

      Object.assign(space, {
        name: dto.name,
        description: dto.description,
        locations: dto.locationIds.map(id => ({ id })),
      });

      await this.spaceRepository.save(space);
      return space;
    } catch (error) {
      logger.error('Failed to update space', {
        error,
        id,
      });
      throw error;
    }
  }

  async deleteSpace(id: string): Promise<void> {
    try {
      const space = await this.spaceRepository.findOne({ where: { id } });
      if (!space) {
        throw new NotFoundException(`Space not found: ${id}`);
      }

      await this.spaceRepository.remove(space);
    } catch (error) {
      logger.error('Failed to delete space', {
        error,
        id,
      });
      throw error;
    }
  }

  async getSpace(id: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({ where: { id } });
    if (!space) {
      throw new NotFoundException(`Space not found: ${id}`);
    }
    return space;
  }

  async getSpaces(): Promise<Space[]> {
    return this.spaceRepository.find();
  }

  async getQuickAccess(): Promise<QuickAccessResponse> {
    const recentFiles: FileItem[] = [];
    const favoriteFiles: FileItem[] = [];
    const sharedFiles: FileItem[] = [];

    return {
      recentFiles,
      favoriteFiles,
      sharedFiles,
    };
  }

  async cleanup(): Promise<void> {
    for (const [id, provider] of this.activeConnections) {
      try {
        await provider.disconnect();
      } catch (error) {
        logger.error('Failed to disconnect provider during cleanup', {
          error,
          locationId: id,
        });
      }
    }
    this.activeConnections.clear();
  }
}
