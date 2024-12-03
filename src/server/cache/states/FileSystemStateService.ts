import { RedisConfig, RedisResult } from '../../../types/redis';
import { BaseStateService } from './BaseStateService';
import { CACHE_KEYS, CACHE_TTL } from '../keys';
import type { FileSystemState } from '../../../types/chatbot';

export class FileSystemStateService extends BaseStateService {
  constructor(config: RedisConfig) {
    super(config);
  }

  public async setFileSystemState(
    userId: string,
    projectId: string,
    state: FileSystemState
  ): Promise<RedisResult<'OK'>> {
    return this.setState(
      userId,
      projectId,
      CACHE_KEYS.FILESYSTEM.STATE,
      state,
      CACHE_TTL.FILESYSTEM.STATE
    );
  }

  public async getFileSystemState(
    userId: string,
    projectId: string
  ): Promise<RedisResult<FileSystemState | null>> {
    return this.getState(userId, projectId, CACHE_KEYS.FILESYSTEM.STATE);
  }

  public async clearFileSystemState(
    userId: string,
    projectId: string
  ): Promise<RedisResult<number>> {
    return this.clearState(userId, projectId, CACHE_KEYS.FILESYSTEM.STATE);
  }
}
