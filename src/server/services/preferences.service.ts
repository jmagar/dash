import { UserPreferences } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../utils/logger';

export class PreferencesService {
  async getPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      return await prisma.userPreferences.findUnique({
        where: { userId },
      });
    } catch (error) {
      logger.error('Failed to get user preferences:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    data: Partial<Pick<UserPreferences, 'themeMode' | 'accentColor'>>
  ): Promise<UserPreferences> {
    try {
      return await prisma.userPreferences.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
        },
      });
    } catch (error) {
      logger.error('Failed to update user preferences:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        data,
      });
      throw error;
    }
  }
}

export const preferencesService = new PreferencesService();
