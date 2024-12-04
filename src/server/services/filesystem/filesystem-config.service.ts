import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ConfigManager } from '../../managers/ConfigManager';
import { Logger } from '../../utils/logger';

// Zod schema for filesystem configuration
const FileSystemConfigSchema = z.object({
  storage: z.object({
    basePath: z.string().min(1).describe('Base path for file storage'),
    tempPath: z.string().min(1).describe('Temporary file storage path'),
    maxTempFileAge: z.number().positive().default(86400000).describe('Maximum age of temporary files in milliseconds'),
    maxFileSize: z.number().positive().default(1024 * 1024 * 100).describe('Maximum file size in bytes'),
    allowedExtensions: z.array(z.string()).optional().describe('List of allowed file extensions'),
    quotaPerUser: z.number().nonnegative().optional().describe('Storage quota per user in bytes')
  }),
  security: z.object({
    strictPathChecks: z.boolean().default(true).describe('Enable strict path validation'),
    allowSymlinks: z.boolean().default(false).describe('Allow symbolic links'),
    protectedDirectories: z.array(z.string()).optional().describe('Directories with extra protection')
  }).optional()
});

// Type inference for configuration
export type FileSystemConfig = z.infer<typeof FileSystemConfigSchema>;

@Injectable()
export class FileSystemConfigService {
  private config: FileSystemConfig;

  constructor(
    private readonly configManager: ConfigManager,
    private readonly logger: Logger
  ) {
    // Load and validate configuration
    this.config = this.loadAndValidateConfig();
  }

  /**
   * Load and validate filesystem configuration
   */
  private loadAndValidateConfig(): FileSystemConfig {
    try {
      // Retrieve filesystem configuration
      const rawConfig = this.configManager.get('fileSystem');

      // Validate configuration using Zod schema
      const validatedConfig = FileSystemConfigSchema.parse(rawConfig);

      this.logger.info('Filesystem configuration loaded successfully', { 
        basePath: validatedConfig.storage.basePath 
      });

      return validatedConfig;
    } catch (error) {
      this.logger.error('Invalid filesystem configuration', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      // Fallback to default configuration
      return {
        storage: {
          basePath: '/data/files',
          tempPath: '/data/temp',
          maxTempFileAge: 86400000,
          maxFileSize: 1024 * 1024 * 100
        }
      };
    }
  }

  /**
   * Get base storage path
   */
  public getBasePath(): string {
    return this.config.storage.basePath;
  }

  /**
   * Get temporary storage path
   */
  public getTempPath(): string {
    return this.config.storage.tempPath;
  }

  /**
   * Get maximum file size
   */
  public getMaxFileSize(): number {
    return this.config.storage.maxFileSize;
  }

  /**
   * Get maximum temporary file age
   */
  public getMaxTempFileAge(): number {
    return this.config.storage.maxTempFileAge;
  }

  /**
   * Check if file extension is allowed
   */
  public isExtensionAllowed(fileExtension: string): boolean {
    const allowedExtensions = this.config.storage.allowedExtensions;
    
    // If no restrictions, allow all
    if (!allowedExtensions || allowedExtensions.length === 0) {
      return true;
    }

    return allowedExtensions.includes(fileExtension.toLowerCase());
  }

  /**
   * Check if path is in protected directories
   */
  public isProtectedDirectory(path: string): boolean {
    const protectedDirs = this.config.security?.protectedDirectories || [];
    return protectedDirs.some(dir => path.startsWith(dir));
  }

  /**
   * Get user storage quota
   */
  public getUserQuota(): number | undefined {
    return this.config.storage.quotaPerUser;
  }

  /**
   * Check if strict path checks are enabled
   */
  public areStrictPathChecksEnabled(): boolean {
    return this.config.security?.strictPathChecks ?? true;
  }

  /**
   * Check if symbolic links are allowed
   */
  public areSymlinksAllowed(): boolean {
    return this.config.security?.allowSymlinks ?? false;
  }
}
