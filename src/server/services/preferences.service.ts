import { PrismaClient, type UserPreferences } from '@prisma/client';
import type { Result } from '../../types/common';
import type { Logger } from '../../types/logger';
import { LoggingManager } from '../managers/LoggingManager';
import { LoggerAdapter } from '../utils/logging/logger.adapter';

export class PreferencesService {
  private readonly logger: Logger;
  private readonly prisma: PrismaClient;

  constructor() {
    this.logger = new LoggerAdapter(LoggingManager.getInstance(), {
      component: 'PreferencesService'
    });
    this.prisma = new PrismaClient();
  }

  async getPreferences(userId: string): Promise<Result<UserPreferences | null>> {
    try {
      const preferences = await this.prisma.userPreferences.findUnique({
        where: { userId },
      });
      return { success: true, data: preferences };
    } catch (error) {
      this.logger.error('Failed to get user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      return { 
        success: false, 
        error: new Error(error instanceof Error ? error.message : 'Failed to get user preferences')
      };
    }
  }

  async updatePreferences(
    userId: string,
    data: Partial<Pick<UserPreferences, 'themeMode' | 'accentColor'>>
  ): Promise<Result<UserPreferences>> {
    try {
      const preferences = await this.prisma.userPreferences.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
        },
      });
      return { success: true, data: preferences };
    } catch (error) {
      this.logger.error('Failed to update user preferences', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        data,
      });
      return { 
        success: false, 
        error: new Error(error instanceof Error ? error.message : 'Failed to update user preferences')
      };
    }
  }
}

export const preferencesService = new PreferencesService();
