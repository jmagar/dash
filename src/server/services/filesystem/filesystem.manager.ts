import { Injectable } from '@nestjs/common';
import { FileSystemProvider, FileSystemType, FilesystemLocation, SftpConfig, SmbConfig, WebdavConfig, RcloneConfig } from './types';
import { WebDAVProvider } from './webdav.provider';
import { SFTPProvider } from './sftp.provider';
import { SMBProvider } from './smb.provider';
import { RcloneProvider } from './rclone.provider';

@Injectable()
export class FileSystemManager {
  private providers = new Map<string, FileSystemProvider>();

  constructor() {}

  public async createProvider(location: FilesystemLocation): Promise<FileSystemProvider> {
    const provider = this.getProviderForType(location.type);
    if (!provider) {
      throw new Error(`Unsupported filesystem type: ${location.type}`);
    }

    await provider.connect();
    this.providers.set(location.id, provider);
    return provider;
  }

  private getProviderForType(type: FileSystemType): FileSystemProvider {
    switch (type) {
      case FileSystemType.SFTP:
        return new SFTPProvider();
      case FileSystemType.SMB:
        return new SMBProvider();
      case FileSystemType.WEBDAV:
        return new WebDAVProvider();
      case FileSystemType.RCLONE:
        return new RcloneProvider();
      default:
        throw new Error(`Unsupported filesystem type: ${type}`);
    }
  }

  public async connectProvider(location: FilesystemLocation): Promise<FileSystemProvider> {
    let provider = this.providers.get(location.id);
    
    if (!provider) {
      provider = this.getProviderForType(location.type);
      if (!provider) {
        throw new Error(`Unsupported filesystem type: ${location.type}`);
      }
    }

    switch (location.type) {
      case FileSystemType.SFTP:
        const sftpConfig = this.validateSftpConfig(location);
        await provider.connect(sftpConfig);
        break;
        
      case FileSystemType.SMB:
        const smbConfig = this.validateSmbConfig(location);
        await provider.connect(smbConfig);
        break;
        
      case FileSystemType.WEBDAV:
        const webdavConfig = this.validateWebdavConfig(location);
        await provider.connect(webdavConfig);
        break;
        
      case FileSystemType.RCLONE:
        const rcloneConfig = this.validateRcloneConfig(location);
        await provider.connect(rcloneConfig);
        break;
        
      default:
        throw new Error(`Unsupported filesystem type: ${location.type}`);
    }

    this.providers.set(location.id, provider);
    return provider;
  }

  public getProvider(locationId: string): FileSystemProvider {
    const provider = this.providers.get(locationId);
    if (!provider) {
      throw new Error(`No provider found for location: ${locationId}`);
    }
    return provider;
  }

  private validateSftpConfig(location: FilesystemLocation): SftpConfig {
    if (!location.credentials) {
      throw new Error('SFTP credentials are required');
    }
    
    const { host, port, username, password, privateKey } = location.credentials;
    
    if (!host || typeof host !== 'string') {
      throw new Error('SFTP host is required and must be a string');
    }
    
    if (port && (typeof port !== 'number' || port <= 0 || port > 65535)) {
      throw new Error('SFTP port must be a valid port number');
    }
    
    if (!username || typeof username !== 'string') {
      throw new Error('SFTP username is required and must be a string');
    }
    
    if (!password && !privateKey) {
      throw new Error('Either password or private key is required for SFTP');
    }
    
    if (password && typeof password !== 'string') {
      throw new Error('SFTP password must be a string');
    }
    
    if (privateKey && typeof privateKey !== 'string') {
      throw new Error('SFTP private key must be a string');
    }
    
    return {
      host,
      port: port || 22,
      username,
      password,
      privateKey
    };
  }

  private validateSmbConfig(location: FilesystemLocation): SmbConfig {
    if (!location.credentials) {
      throw new Error('SMB credentials are required');
    }
    
    const { host, share, username, password, domain } = location.credentials;
    
    if (!host || typeof host !== 'string') {
      throw new Error('SMB host is required and must be a string');
    }
    
    if (!share || typeof share !== 'string') {
      throw new Error('SMB share is required and must be a string');
    }
    
    if (!username || typeof username !== 'string') {
      throw new Error('SMB username is required and must be a string');
    }
    
    if (!password || typeof password !== 'string') {
      throw new Error('SMB password is required and must be a string');
    }
    
    if (domain && typeof domain !== 'string') {
      throw new Error('SMB domain must be a string');
    }
    
    return {
      host,
      share,
      username,
      password,
      domain
    };
  }

  private validateWebdavConfig(location: FilesystemLocation): WebdavConfig {
    if (!location.credentials) {
      throw new Error('WebDAV credentials are required');
    }
    
    const { url, username, password } = location.credentials;
    
    if (!url || typeof url !== 'string') {
      throw new Error('WebDAV URL is required and must be a string');
    }
    
    if (!username || typeof username !== 'string') {
      throw new Error('WebDAV username is required and must be a string');
    }
    
    if (!password || typeof password !== 'string') {
      throw new Error('WebDAV password is required and must be a string');
    }
    
    return {
      url,
      username,
      password
    };
  }

  private validateRcloneConfig(location: FilesystemLocation): RcloneConfig {
    if (!location.credentials) {
      throw new Error('Rclone credentials are required');
    }
    
    const { remote, configPath } = location.credentials;
    
    if (!remote || typeof remote !== 'string') {
      throw new Error('Rclone remote is required and must be a string');
    }
    
    if (!configPath || typeof configPath !== 'string') {
      throw new Error('Rclone config path is required and must be a string');
    }
    
    return {
      remote,
      configPath
    };
  }
}
