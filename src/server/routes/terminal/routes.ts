import { z } from 'zod';
import { createRouter, createRouteHandler, logRouteAccess } from '../routeUtils';
import { cache } from '../../cache';
import { requireAuth } from '../../middleware/auth';
import { ApiError } from '../../../types/error';
import type { CacheCommand } from '../../../types/cache';
import type { LogMetadata } from '../../../types/logger';
import type { ApiResponse } from '../../../types/models-shared';

// Validation schemas
const terminalIdSchema = z.object({
  params: z.object({
    hostId: z.string()
  })
});

const cacheCommandSchema = z.object({
  body: z.object({
    command: z.string(),
    workingDirectory: z.string().optional()
  })
});

const getCommandHistorySchema = z.object({
  params: z.object({
    hostId: z.string()
  })
});

export const router = createRouter();

// Apply authentication to all terminal routes
router.use(requireAuth);

// Cache a terminal command for a specific host
router.post('/:hostId/command', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;
    const { command, workingDirectory } = req.body;
    if (!command.trim()) {
      throw new ApiError('Command cannot be empty', 400);
    }

    try {
      const commandData: CacheCommand = {
        command,
        workingDirectory,
        timestamp: new Date(),
      };

      const commandId = String(hostId);
      await cache.setCommand(commandId, JSON.stringify(commandData));

      logRouteAccess('Command cached', {
        userId: req.user.id,
        hostId: String(hostId),
        command,
        workingDirectory,
      });

      return { success: true, data: null };
    } catch (error) {
      const metadata: LogMetadata = {
        userId: req.user?.id,
        hostId: String(hostId),
        command,
        workingDirectory,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logRouteAccess('Failed to cache command:', metadata);

      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to cache command',
        undefined,
        500,
        metadata
      );
    }
  },
  {
    requireAuth: true,
    schema: cacheCommandSchema.merge(terminalIdSchema)
  }
));

// Get command history for a specific host
router.get('/:hostId/history', createRouteHandler(
  async (req) => {
    const { hostId } = req.params;

    try {
      const commandId = String(hostId);
      const commandData = await cache.getCommand(commandId);
      if (!commandData) {
        return { success: true, data: [] };
      }

      const commands = JSON.parse(commandData);
      if (!Array.isArray(commands)) {
        throw new Error('Invalid command history format');
      }

      return { success: true, data: commands };
    } catch (error) {
      const metadata: LogMetadata = {
        userId: req.user?.id,
        hostId: String(hostId),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      logRouteAccess('Failed to get command history:', metadata);

      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to get command history',
        undefined,
        500,
        metadata
      );
    }
  },
  {
    requireAuth: true,
    schema: getCommandHistorySchema
  }
));
