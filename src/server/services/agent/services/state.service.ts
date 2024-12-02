import { PrismaClient, Prisma } from '@prisma/client';
import { 
  AgentState,
  AgentInfo, 
  AgentOperationResult,
  ICacheService,
  AgentCapability
} from '../agent.types';
import { AgentStatus } from '../../../../types/agent-config';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../../types/error';
import type { LogMetadata } from '../../../../types/logger';
import { isAgentInfo, validateAgentInfo } from '../utils/validation';
import { CACHE_TTL, ERROR_CODES, LOG_METADATA } from '../utils/constants';
import { handleError } from '../utils/error.handler';

type AgentStateUpdate = Partial<Omit<AgentState, 'info' | 'connection'>> & {
  info?: Partial<AgentInfo>;
};

type StateServiceDeps = {
  prisma: PrismaClient;
  cache?: ICacheService;
};

export class StateService {
  private readonly agents: Map<string, AgentState>;
  private readonly prisma: PrismaClient;
  private readonly cache?: ICacheService;
  private readonly stateUpdateCallbacks: Set<(state: AgentState) => void>;

  constructor({ prisma, cache }: StateServiceDeps) {
    this.prisma = prisma;
    this.cache = cache;
    this.agents = new Map();
    this.stateUpdateCallbacks = new Set();
  }

  onStateUpdate(callback: (state: AgentState) => void): () => void {
    this.stateUpdateCallbacks.add(callback);
    return () => {
      this.stateUpdateCallbacks.delete(callback);
    };
  }

  private notifyStateUpdate(state: AgentState): void {
    this.stateUpdateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        handleError(error, {
          code: ERROR_CODES.INTERNAL_ERROR,
          [LOG_METADATA.AGENT_ID]: state.info.id,
          context: 'state_update_callback'
        });
      }
    });
  }

  async getAgent(agentId: string): Promise<AgentOperationResult<AgentInfo>> {
    try {
      // Try memory cache first
      const memoryState = this.agents.get(agentId);
      if (memoryState) {
        return { 
          success: true, 
          data: memoryState.info,
          timestamp: new Date().toISOString()
        };
      }

      // Try distributed cache
      if (this.cache) {
        const cachedAgent = await this.cache.get<AgentInfo>(`agent:${agentId}`);
        if (cachedAgent && isAgentInfo(cachedAgent)) {
          return { 
            success: true, 
            data: cachedAgent,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Query database
      const host = await this.prisma.host.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          hostname: true,
          agentStatus: true,
          agentVersion: true,
          agentLastSeen: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!host) {
        return {
          success: false,
          error: {
            message: `Agent not found: ${agentId}`,
            code: ERROR_CODES.AGENT_NOT_FOUND,
            details: { agentId }
          },
          timestamp: new Date().toISOString()
        };
      }

      const metadata = host.metadata as Record<string, unknown>;
      const agentInfo: AgentInfo = {
        id: host.id,
        hostname: host.hostname,
        ipAddress: metadata.ipAddress as string,
        osType: metadata.osType as 'linux' | 'windows' | 'darwin',
        osVersion: metadata.osVersion as string,
        agentVersion: host.agentVersion ?? undefined,
        labels: metadata.labels as Record<string, string>,
        capabilities: metadata.capabilities as AgentCapability[],
        status: host.agentStatus as AgentStatus,
        startTime: metadata.startTime as string,
        lastConfigUpdate: metadata.lastConfigUpdate as string
      };

      const validatedInfo = validateAgentInfo(agentInfo);
      if (!validatedInfo.success) {
        return {
          success: false,
          error: {
            message: 'Invalid agent info in database',
            code: ERROR_CODES.VALIDATION_ERROR,
            details: { 
              agentId,
              validationErrors: validatedInfo.error
            }
          },
          timestamp: new Date().toISOString()
        };
      }

      // Cache the validated info
      if (this.cache) {
        await this.cache.set(`agent:${agentId}`, validatedInfo.data, CACHE_TTL);
      }

      return {
        success: true,
        data: validatedInfo.data,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        [LOG_METADATA.AGENT_ID]: agentId
      });

      return {
        success: false,
        error: {
          message: 'Failed to get agent info',
          code: ERROR_CODES.INTERNAL_ERROR,
          details: { 
            agentId,
            error: error instanceof Error ? error.message : String(error)
          }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async updateAgentInfo(agentId: string, info: AgentInfo): Promise<void> {
    try {
      const validatedInfo = validateAgentInfo(info);
      if (!validatedInfo.success) {
        throw new ApiError('Invalid agent info', {
          code: ERROR_CODES.VALIDATION_ERROR,
          details: { 
            agentId,
            validationErrors: validatedInfo.error
          }
        });
      }

      const updateData: Prisma.HostUpdateInput = {
        hostname: info.hostname,
        agentStatus: info.status,
        agentVersion: info.agentVersion,
        agentLastSeen: new Date(),
        metadata: {
          ipAddress: info.ipAddress,
          osType: info.osType,
          osVersion: info.osVersion,
          labels: info.labels,
          capabilities: info.capabilities,
          startTime: info.startTime,
          lastConfigUpdate: info.lastConfigUpdate
        }
      };

      await this.prisma.host.update({
        where: { id: agentId },
        data: updateData
      });

      // Update caches
      const state = this.agents.get(agentId);
      if (state) {
        const updatedState: AgentState = {
          ...state,
          info: validatedInfo.data,
          lastSeen: new Date()
        };
        this.agents.set(agentId, updatedState);
        this.notifyStateUpdate(updatedState);
      }

      if (this.cache) {
        await this.cache.set(`agent:${agentId}`, validatedInfo.data, CACHE_TTL);
      }

    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        [LOG_METADATA.AGENT_ID]: agentId
      });
      throw error;
    }
  }

  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<void> {
    try {
      await this.prisma.host.update({
        where: { id: agentId },
        data: {
          agentStatus: status,
          agentLastSeen: new Date()
        }
      });

      // Update caches
      const state = this.agents.get(agentId);
      if (state) {
        const updatedState: AgentState = {
          ...state,
          info: {
            ...state.info,
            status
          },
          lastSeen: new Date()
        };
        this.agents.set(agentId, updatedState);
        this.notifyStateUpdate(updatedState);
      }

      if (this.cache) {
        const cachedInfo = await this.cache.get<AgentInfo>(`agent:${agentId}`);
        if (cachedInfo) {
          await this.cache.set(
            `agent:${agentId}`,
            { ...cachedInfo, status },
            CACHE_TTL
          );
        }
      }

    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        [LOG_METADATA.AGENT_ID]: agentId
      });
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      await this.prisma.host.delete({
        where: { id: agentId }
      });

      // Clear caches
      this.agents.delete(agentId);
      if (this.cache) {
        await this.cache.del(`agent:${agentId}`);
      }

    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        [LOG_METADATA.AGENT_ID]: agentId
      });
      throw error;
    }
  }
}
