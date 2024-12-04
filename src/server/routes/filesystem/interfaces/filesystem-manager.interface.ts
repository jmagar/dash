import { FileSystemEntryDto } from '../dto/filesystem-entry.dto';
import { FileSystemStatsDto } from '../dto/filesystem-stats.dto';

export interface IFileSystemManagerController {
  /**
   * List directory contents
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param path Directory path
   * @returns Promise of filesystem entries
   */
  listDirectory(userId: string, hostId: string, path: string): Promise<FileSystemEntryDto[]>;

  /**
   * Get file/directory stats
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param path File or directory path
   * @returns Promise of filesystem stats
   */
  getStats(userId: string, hostId: string, path: string): Promise<FileSystemStatsDto>;

  /**
   * Create a directory
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param path Directory path to create
   * @param recursive Whether to create parent directories
   */
  createDirectory(userId: string, hostId: string, path: string, recursive?: boolean): Promise<void>;

  /**
   * Delete a file or directory
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param path Path to delete
   */
  delete(userId: string, hostId: string, path: string): Promise<void>;

  /**
   * Move or rename a file/directory
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param sourcePath Source path
   * @param destinationPath Destination path
   */
  move(userId: string, hostId: string, sourcePath: string, destinationPath: string): Promise<void>;

  /**
   * Write file contents
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param path File path
   * @param content File contents
   * @param encoding Optional file encoding
   */
  writeFile(userId: string, hostId: string, path: string, content: string, encoding?: string): Promise<void>;

  /**
   * Read file contents
   * @param userId User identifier
   * @param hostId Host/location identifier
   * @param path File path
   * @returns Promise of file contents as string
   */
  readFile(userId: string, hostId: string, path: string): Promise<string>;
}
