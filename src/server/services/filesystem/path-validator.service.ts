import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { SecurityError } from '../../utils/errorHandler';
import { SecurityManager } from '../../managers/SecurityManager';
import { ConfigManager } from '../../managers/ConfigManager';
import { Logger } from '../../utils/logger';

@Injectable()
export class PathValidationService {
  private baseStoragePath: string;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly securityManager: SecurityManager,
    private readonly logger: Logger
  ) {
    // Get base storage path from configuration
    const config = this.configManager.get('fileSystem');
    this.baseStoragePath = config?.storage?.basePath || '/';
  }

  /**
   * Validate user access to a specific path
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param inputPath Path to validate
   * @throws {SecurityError} If access is not permitted
   */
  public async validatePathAccess(userId: string, hostId: string, inputPath: string): Promise<string> {
    // Validate input parameters
    this.validateInputParameters(userId, hostId, inputPath);

    // Validate user permissions
    await this.checkUserPermissions(userId, hostId, inputPath);

    // Sanitize and validate path
    const sanitizedPath = this.sanitizePath(inputPath);
    this.ensurePathWithinBaseStorage(sanitizedPath);

    return sanitizedPath;
  }

  /**
   * Validate basic input parameters
   */
  private validateInputParameters(userId: string, hostId: string, inputPath: string): void {
    if (!userId) {
      throw new SecurityError('User ID is required', { 
        operation: 'path_access', 
        details: 'Missing user ID' 
      });
    }

    if (!hostId) {
      throw new SecurityError('Host ID is required', { 
        operation: 'path_access', 
        details: 'Missing host ID' 
      });
    }

    if (!inputPath) {
      throw new SecurityError('Path is required', { 
        operation: 'path_access', 
        details: 'Missing path' 
      });
    }
  }

  /**
   * Check user permissions for the path
   */
  private async checkUserPermissions(userId: string, hostId: string, inputPath: string): Promise<void> {
    const hasAccess = await this.securityManager.validateUserPathAccess(userId, hostId, inputPath);
    if (!hasAccess) {
      this.logger.warn('Unauthorized path access attempt', {
        userId,
        hostId,
        path: inputPath,
        operation: 'path_access'
      });

      throw new SecurityError('Access denied to specified path', {
        userId,
        hostId,
        path: inputPath,
        operation: 'path_access'
      });
    }
  }

  /**
   * Sanitize and normalize path
   */
  private sanitizePath(inputPath: string): string {
    // Remove directory traversal and normalize path
    const cleanPath = inputPath
      .replace(/\.\./g, '')     // Remove directory traversal
      .replace(/\/+/g, '/')     // Normalize multiple slashes
      .replace(/^\/+/, '')      // Remove leading slashes
      .trim();                  // Remove leading/trailing whitespace

    // Resolve to absolute path within base storage
    return path.resolve(this.baseStoragePath, cleanPath);
  }

  /**
   * Ensure path is within base storage
   */
  private ensurePathWithinBaseStorage(sanitizedPath: string): void {
    // Normalize paths to prevent bypassing checks
    const normalizedBasePath = path.normalize(this.baseStoragePath);
    const normalizedPath = path.normalize(sanitizedPath);

    if (!normalizedPath.startsWith(normalizedBasePath)) {
      this.logger.error('Path outside allowed storage', {
        path: sanitizedPath,
        baseStoragePath: this.baseStoragePath,
        operation: 'path_validation'
      });

      throw new SecurityError('Path is outside allowed storage', {
        path: sanitizedPath,
        operation: 'path_validation'
      });
    }
  }
}
