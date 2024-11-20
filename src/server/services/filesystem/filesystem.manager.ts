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
    // TODO: Implement file listing
    throw new Error('Not implemented');
  }

  async createDownloadStream(locationId: string, path: string): Promise<NodeJS.ReadableStream> {
    // TODO: Implement file download
    throw new Error('Not implemented');
  }

  async uploadFiles(locationId: string, path: string, files: Express.Multer.File[]): Promise<void> {
    // TODO: Implement file upload
    throw new Error('Not implemented');
  }

  async copyFiles(locationId: string, dto: CopyMoveDto): Promise<void> {
    // TODO: Implement file copy
    throw new Error('Not implemented');
  }

  async moveFiles(locationId: string, dto: CopyMoveDto): Promise<void> {
    // TODO: Implement file move
    throw new Error('Not implemented');
  }

  async createDirectory(locationId: string, dto: CreateDirectoryDto): Promise<void> {
    // TODO: Implement directory creation
    throw new Error('Not implemented');
  }

  async deleteFiles(locationId: string, dto: DeleteFilesDto): Promise<void> {
    // TODO: Implement file deletion
    throw new Error('Not implemented');
  }

  async searchFiles(locationId: string, dto: SearchFilesDto): Promise<FileListResponse> {
    // TODO: Implement file search
    throw new Error('Not implemented');
  }

  // Spaces Management
  async listSpaces(): Promise<Space[]> {
    // TODO: Implement space listing
    return [];
  }

  async createSpace(dto: CreateSpaceDto): Promise<Space> {
    // TODO: Implement space creation
    throw new Error('Not implemented');
  }

  async updateSpace(id: string, dto: UpdateSpaceDto): Promise<Space> {
    // TODO: Implement space update
    throw new Error('Not implemented');
  }

  async deleteSpace(id: string): Promise<void> {
    // TODO: Implement space deletion
    throw new Error('Not implemented');
  }

  // Quick Access
  async getQuickAccess(): Promise<QuickAccessResponse> {
    // TODO: Implement quick access
    return {
      recent: [],
      favorites: []
    };
  }

  async addToFavorites(locationId: string, path: string): Promise<void> {
    // TODO: Implement add to favorites
    throw new Error('Not implemented');
  }

  async removeFromFavorites(locationId: string, path: string): Promise<void> {
    // TODO: Implement remove from favorites
    throw new Error('Not implemented');
  }

  // File Selection
  async selectFiles(dto: SelectFilesDto): Promise<FileListResponse> {
    // TODO: Implement file selection
    throw new Error('Not implemented');
  }
}
