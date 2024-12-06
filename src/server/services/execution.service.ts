import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { LoggingManager } from '../managers/LoggingManager';
import { getAgentService } from './agent.service';
import { sshService } from './ssh.service';
import { db } from '../db';
import type { Host, Command, CommandResult } from '../../types/models-shared';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from '../../types/socket-events';

declare global {
  // eslint-disable-next-line no-var
  var io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;
}

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
  private readonly logger: LoggingManager;

  constructor(private readonly io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
    super();
    this.logger = LoggingManager.getInstance();
  }

  /**
   * Execute a command on a host
   */
  async executeCommand(
    host: Host,
    request: Command,
    options: ExecutionOptions = {}
  ): Promise<CommandResult> {
    const startedAt = new Date();

    // Create base command object
    const command: Command = {
      id: Math.random().toString(36).substring(2, 15),
      hostId: host.id,
      command: request.command,
      args: request.args,
      cwd: request.cwd,
      env: request.env,
      request,
      status: 'running',
      createdAt: startedAt,
      startedAt,
      updatedAt: startedAt,
    };

    try {
      const agentService = getAgentService();
      if (!agentService.isConnected(host.id)) {
        return await this.executeViaSSH(host, command);
      }

      return await this.executeViaAgent(host.id, command, options);
    } catch (error) {
      this.logger.error('Command execution failed:', {
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
      const startTime = Date.now();

      return new Promise((resolve, reject) => {
        const agentService = getAgentService();
        const timeout = setTimeout(() => {
          reject(new Error('Command execution timeout'));
        }, options.timeout || 30000);

        const handler = ({ hostId: resultHostId, command: resultCommand, result }: { hostId: string; command: string; result: string }) => {
          if (resultHostId === hostId && resultCommand === command.command) {
            clearTimeout(timeout);
            agentService.removeListener('agent:command', handler);
            const endTime = Date.now();
            resolve({
              stdout: result,
              stderr: '',
              exitCode: 0,
              duration: endTime - startTime,
              status: 'completed'
            });
          }
        };

        agentService.on('agent:command', handler);

        agentService.executeCommand(hostId, command.command, command.args).catch(error => {
          clearTimeout(timeout);
          agentService.removeListener('agent:command', handler);
          reject(error);
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Agent command execution failed: ${errorMessage}`);
    }
  }

  /**
   * Execute command via SSH
   */
  private async executeViaSSH(host: Host, command: Command): Promise<CommandResult> {
    try {
      const startTime = Date.now();
      const fullCommand = command.args ? `${command.command} ${command.args.join(' ')}` : command.command;
      const result = await sshService.executeCommand(host.id, fullCommand);
      const endTime = Date.now();

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        duration: endTime - startTime,
        status: result.exitCode === 0 ? 'completed' : 'failed'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`SSH command execution failed: ${errorMessage}`);
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

// Export singleton instance with global.io from socket setup
export const executionService = new ExecutionService(global.io);
