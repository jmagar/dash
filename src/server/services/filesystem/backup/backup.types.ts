export interface BackupOptions {
  maxVersions?: number;
  backupPath?: string;
  includeMetadata?: boolean;
}

export interface FileVersion {
  path: string;
  timestamp: number;
  hash: string;
  size: number;
  metadata?: Record<string, unknown>;
}

export interface BackupStorage {
  createBackup(filePath: string, options: BackupOptions): Promise<FileVersion>;
  restoreBackup(backupPath: string, targetPath: string): Promise<void>;
  getOriginalPath(backupPath: string): string;
}

export interface BackupVersioning {
  manageVersions(filePath: string, maxVersions?: number): Promise<void>;
  listVersions(filePath: string): Promise<FileVersion[]>;
}

export interface BackupValidation {
  validateSourcePath(filePath: string): Promise<void>;
  validateBackupPath(backupPath: string): Promise<void>;
  validateRestorePath(targetPath: string): Promise<void>;
}
