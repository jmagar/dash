import axios from 'axios';
import type { Request, Response } from 'express';

import {
  DEFAULT_CHAT_SETTINGS,
  type ChatRequest,
  type ChatResponse,
  type ChatSession,
  type ChatSessionResponse,
  type ChatSessionsResponse,
  type ChatSettings,
  type ChatResponseData,
  type ChatError,
} from '../../types/chat';
import { createApiError } from '../../types/error';
import type { LogMetadata } from '../../types/logger';
import type { SystemStats, Host, Command, DockerContainer, DockerNetwork, DockerVolume } from '../../types/models-shared';
import cache from '../cache';
import { config } from '../config';
import { db } from '../db';
import { logger } from '../utils/logger';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  logger.error('OPENROUTER_API_KEY is not set in environment variables');
  throw new Error('OPENROUTER_API_KEY is not set in environment variables');
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AppContext {
  hosts: {
    host: Host;
    stats?: SystemStats;
    docker?: {
      containers: DockerContainer[];
      networks: DockerNetwork[];
      volumes: DockerVolume[];
    };
  }[];
  recentCommands: Command[];
}

async function getAppContext(userId: string): Promise<AppContext> {
  try {
    // Get active hosts
    const hostsResult = await db.query<Host>(
      'SELECT * FROM hosts WHERE user_id = $1 AND status = $2',
      [userId, 'connected']
    );
    const hosts = hostsResult.rows;

    // Get context for each host
    const hostsContext = await Promise.all(
      hosts.map(async (host) => {
        const context: AppContext['hosts'][0] = { host };

        // Get system stats
        const statsData = await cache.getSession(`stats:${host.id}`);
        if (statsData) {
          context.stats = JSON.parse(statsData);
        }

        // Get Docker context
        const containersResult = await db.query<DockerContainer>(
          'SELECT * FROM docker_containers WHERE host_id = $1',
          [host.id]
        );
        const networksResult = await db.query<DockerNetwork>(
          'SELECT * FROM docker_networks WHERE host_id = $1',
          [host.id]
        );
        const volumesResult = await db.query<DockerVolume>(
          'SELECT * FROM docker_volumes WHERE host_id = $1',
          [host.id]
        );

        if (containersResult.rows.length > 0) {
          context.docker = {
            containers: containersResult.rows,
            networks: networksResult.rows,
            volumes: volumesResult.rows,
          };
        }

        return context;
      })
    );

    // Get recent commands
    const commandsResult = await db.query<Command>(
      'SELECT * FROM commands WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    );

    return {
      hosts: hostsContext,
      recentCommands: commandsResult.rows,
    };
  } catch (error) {
    logger.error('Failed to get app context:', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

function formatAppContext(context: AppContext): string {
  let output = 'Current SSH Management Platform Status:\n\n';

  if (context.hosts.length === 0) {
    output += 'No active SSH connections\n';
    return output;
  }

  // Process each host
  context.hosts.forEach(({ host, stats, docker }) => {
    output += `=== ${host.name} (${host.hostname}:${host.port}) ===\n`;

    // System stats
    if (stats) {
      output += 'System:\n';
      output += `  - CPU: ${stats.cpu.usage.toFixed(1)}% (${stats.cpu.cores} cores)\n`;
      output += `  - Memory: ${formatBytes(stats.memory.used)}/${formatBytes(stats.memory.total)}\n`;
      output += `  - Uptime: ${formatUptime(stats.uptime)}\n`;
    }

    // Docker information
    if (docker) {
      // Group containers by compose project
      const composeGroups = new Map<string, DockerContainer[]>();
      const standaloneContainers: DockerContainer[] = [];

      docker.containers.forEach(container => {
        if (container.compose?.project) {
          const group = composeGroups.get(container.compose.project) || [];
          group.push(container);
          composeGroups.set(container.compose.project, group);
        } else {
          standaloneContainers.push(container);
        }
      });

      output += '\nDocker:\n';

      // Compose projects
      composeGroups.forEach((containers, project) => {
        const compose = containers[0].compose!;
        output += `  🐳 Compose Project: ${project}\n`;
        output += `    Config: ${compose.configFile}\n`;
        output += `    Services:\n`;
        containers.forEach(container => {
          output += formatContainer(container, '      ');
        });
      });

      // Standalone containers
      if (standaloneContainers.length > 0) {
        output += '  🐳 Containers:\n';
        standaloneContainers.forEach(container => {
          output += formatContainer(container, '    ');
        });
      }

      // Networks
      if (docker.networks.length > 0) {
        output += '  🌐 Networks:\n';
        docker.networks.forEach(network => {
          output += `    ${network.name} (${network.driver}):\n`;
          output += `      Subnet: ${network.subnet}\n`;
          output += `      Gateway: ${network.gateway}\n`;
        });
      }

      // Volumes
      if (docker.volumes.length > 0) {
        output += '  💾 Volumes:\n';
        docker.volumes.forEach(volume => {
          output += `    ${volume.name}:\n`;
          output += `      ${volume.source} -> ${volume.destination}\n`;
        });
      }
    }

    output += '\n';
  });

  // Recent commands
  if (context.recentCommands.length > 0) {
    output += 'Recent Commands:\n';
    context.recentCommands.forEach(cmd => {
      const date = cmd.createdAt instanceof Date ? cmd.createdAt : new Date(cmd.createdAt);
      output += `- ${cmd.command} (${formatDate(date)})\n`;
    });
  }

  return output;
}

function formatContainer(container: DockerContainer, indent = ''): string {
  let info = `${indent}📦 ${container.name} (${container.status}):\n`;
  info += `${indent}  Image: ${container.image}\n`;

  if (container.ports.length > 0) {
    info += `${indent}  Ports:\n`;
    container.ports.forEach(port => {
      info += `${indent}    ${port.ip}:${port.external} -> ${port.internal}/${port.protocol}\n`;
    });
  }

  if (container.networks.length > 0) {
    info += `${indent}  Networks:\n`;
    container.networks.forEach(network => {
      info += `${indent}    ${network.name}: ${network.ipAddress}\n`;
    });
  }

  if (container.volumes.length > 0) {
    info += `${indent}  Volumes:\n`;
    container.volumes.forEach(volume => {
      info += `${indent}    ${volume.source} -> ${volume.destination}\n`;
    });
  }

  return info;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

function formatDate(date: Date): string {
  return date.toLocaleString();
}

export async function generateChatResponse(
  req: Request<unknown, ChatResponse, ChatRequest>,
  res: Response<ChatResponse>
): Promise<void> {
  const {
    message,
    model = DEFAULT_CHAT_SETTINGS.model,
    maxTokens = DEFAULT_CHAT_SETTINGS.maxTokens,
    temperature = DEFAULT_CHAT_SETTINGS.temperature,
    systemPrompt,
    metadata = {},
  } = req.body;

  const userId = req.user?.id;

  if (!userId) {
    const error: ChatError = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    };
    void res.status(401).json({
      success: false,
      error: error.message,
    });
    return;
  }

  try {
    const requestMetadata: LogMetadata = {
      ...metadata,
      userId,
      messageLength: message.length,
      model,
      maxTokens,
      temperature,
    };
    logger.info('Generating chat response', requestMetadata);

    // Get app context
    const context = await getAppContext(userId);
    const formattedContext = formatAppContext(context);

    // Create system message
    const defaultSystemPrompt = `You are an AI assistant for the SSH Management Platform. You help users manage their SSH connections, execute commands, monitor system resources, and manage Docker containers.

Current System Context:
${formattedContext}

Guidelines:
1. Always consider the current system state when answering
2. For commands, mention which host they'll run on
3. Include relevant system stats when discussing performance
4. Suggest related actions when appropriate
5. Be security-conscious with sensitive operations

How can I assist you with managing your SSH connections and Docker containers?`;

    const response = await axios.post<OpenRouterResponse>(
      OPENROUTER_API_URL,
      {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || defaultSystemPrompt,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': config.baseUrl,
          'X-Title': config.appName,
        },
      }
    );

    const responseData: ChatResponseData = {
      message: response.data.choices[0].message.content,
      model: response.data.model,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens,
      },
      metadata: requestMetadata,
    };

    logger.info('Chat response generated successfully', {
      ...requestMetadata,
      tokens: responseData.usage.totalTokens,
      finishReason: response.data.choices[0].finish_reason,
    });

    void res.json({
      success: true,
      data: responseData,
    });
    return;

  } catch (error) {
    const errorMetadata: LogMetadata = {
      userId,
      messageLength: message.length,
      model,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('OpenRouter API request failed:', errorMetadata);

    const apiError = createApiError('Failed to generate chat response', error, 500);
    void res.status(500).json({
      success: false,
      error: apiError.message,
    });
    return;
  }
}

export async function getSessions(
  req: Request,
  res: Response<ChatSessionsResponse>
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const sessionsResult = await db.query<ChatSession>(
      'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    const sessions = sessionsResult.rows;

    logger.info('Chat sessions fetched successfully', {
      userId,
      sessionCount: sessions.length,
    });

    void res.json({
      success: true,
      data: sessions,
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to fetch chat sessions:', metadata);

    const apiError = createApiError('Failed to fetch chat sessions', error, 500);
    void res.status(500).json({
      success: false,
      error: apiError.message,
    });
    return;
  }
}

export async function getSession(
  req: Request<{ id: string }>,
  res: Response<ChatSessionResponse>
): Promise<void> {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      void res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const sessionResult = await db.query<ChatSession>(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    const session = sessionResult.rows[0];

    if (!session) {
      void res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    logger.info('Chat session fetched successfully', {
      sessionId: id,
      userId,
      messageCount: session.messages.length,
    });

    void res.json({
      success: true,
      data: session,
    });
    return;

  } catch (error) {
    const metadata: LogMetadata = {
      sessionId: id,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    logger.error('Failed to fetch chat session:', metadata);

    const apiError = createApiError('Failed to fetch chat session', error, 500);
    void res.status(500).json({
      success: false,
      error: apiError.message,
    });
    return;
  }
}
