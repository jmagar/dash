import { EventEmitter } from 'events';
import type { Host, Command, CommandRequest, CommandResult } from '../../types/models-shared';
import { agentService } from './agent.service';
import { logger } from '../utils/logger';
import { ApiError } from '../../types/error';
import { db } from '../db';

export enum ExecutionMode {
  AGENT = 'agent'
}

interface ExecutionOptions {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  pty?: boolean;
}

class ExecutionService extends EventEmitter {
  /**
   * Execute a command on a host
   */
  async executeCommand(
    host: Host,
    request: CommandRequest,
    options: ExecutionOptions = {}
  ): Promise<CommandResult> {
    const startedAt = new Date();

    // Create base command object
    const command: Command = {
      id: Math.random().toString(36).substring(2, 15),
      command: request.command,
      args: request.args,
      cwd: request.cwd,
      env: request.env,
      status: 'running',
      stdout: '',
      stderr: '',
      startedAt,
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    try {
      if (!agentService.isConnected(host.id)) {
        throw new ApiError('Agent not connected', null, 400);
      }
      
      return await this.executeViaAgent(host.id, command, options);
    } catch (error) {
      logger.error('Command execution failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hostId: host.id,
        command: request.command,
      });

      // Update command status in database
      await this.updateCommandStatus(host.id, command.id, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Execute command via agent
   */
  private async executeViaAgent(
    hostId: string,
    command: Command,
    options: ExecutionOptions
  ): Promise<CommandResult> {
    try {
      // Store command in database
      await this.storeCommand(hostId, command);

      // Execute command
      await agentService.executeCommand(hostId, command.command, command.args || [], {
        env: options.env,
        cwd: options.cwd,
        timeout: options.timeout,
      });

      // Wait for command result via WebSocket
      const result = await new Promise<CommandResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Command execution timeout'));
        }, options.timeout || 30000);

        const handler = (data: { agentId: string; result: CommandResult }) => {
          if (data.agentId === hostId) {
            clearTimeout(timeout);
            agentService.removeListener('agent:commandResult', handler);
            resolve(data.result);
          }
        };

        agentService.on('agent:commandResult', handler);
      });

      // Update command status in database
      await this.updateCommandStatus(hostId, command.id, result.status, {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        completedAt: result.completedAt,
      });

      return result;
    } catch (error) {
      throw new ApiError(
        `Agent command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Store command in database
   */
  private async storeCommand(hostId: string, command: Command): Promise<void> {
    await db.query(
      `INSERT INTO commands (
        id, host_id, command, args, cwd, env, status,
        started_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        command.id,
        hostId,
        command.command,
        JSON.stringify(command.args || []),
        command.cwd || null,
        JSON.stringify(command.env || {}),
        command.status,
        command.startedAt,
        command.createdAt,
        command.updatedAt,
      ]
    );
  }

  /**
   * Update command status in database
   */
  private async updateCommandStatus(
    hostId: string,
    commandId: string,
    status: string,
    updates: {
      exitCode?: number;
      stdout?: string;
      stderr?: string;
      completedAt?: Date;
      error?: string;
    }
  ): Promise<void> {
    const now = new Date();
    await db.query(
      `UPDATE commands SET
        status = $1,
        exit_code = $2,
        stdout = $3,
        stderr = $4,
        completed_at = $5,
        metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{error}',
          $6::jsonb
        ),
        updated_at = $7
      WHERE id = $8 AND host_id = $9`,
      [
        status,
        updates.exitCode || null,
        updates.stdout || null,
        updates.stderr || null,
        updates.completedAt || null,
        updates.error ? JSON.stringify(updates.error) : null,
        now,
        commandId,
        hostId,
      ]
    );
  }
}

// Export singleton instance
export const executionService = new ExecutionService();
