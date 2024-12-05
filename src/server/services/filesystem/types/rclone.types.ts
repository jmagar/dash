import { FileSystemCredentials } from '../../../../types/filesystem';

/**
 * Interface representing a file or directory item returned by Rclone's lsjson command.
 * Contains metadata about the filesystem item such as name, size, modification time, and type.
 */
export interface RcloneItem {
  /** Name of the file or directory */
  Name: string;
  /** Size in bytes */
  Size: number;
  /** Modification time in RFC3339 format */
  ModTime: string;
  /** Whether this item is a directory */
  IsDir: boolean;
  /** MIME type of the file, if available */
  MimeType?: string;
  /** Whether the file is encrypted, if applicable */
  Encrypted?: boolean;
}

/**
 * Extended credentials interface for Rclone filesystem provider.
 * Contains required fields for connecting to an Rclone remote.
 */
export interface RcloneCredentials extends FileSystemCredentials {
  /** Name of the Rclone remote to use */
  remote: string;
  /** Path to the Rclone configuration file */
  configPath: string;
  /** Content of the Rclone configuration file */
  configContent: string;
  /** Type must be 'rclone' */
  type: 'rclone';
}

/**
 * Result of an Rclone command execution
 */
export interface RcloneCommandResult {
  stdout: string;
  stderr: string;
}
