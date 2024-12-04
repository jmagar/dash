import type { WebSocket } from 'ws';
import type { Socket } from 'socket.io';
import type { 
  AgentMessage, 
  AgentId, 
  ConnectionId,
  AgentInfo,
  AgentMetrics,
  AgentCommandResult,
  ExtractMessage
} from '../agent.types';
import { ERROR_CODES } from '../utils/constants';
import { 
  validateAgentMessage,
  validateMessageByType,
  validateAgentId,
  validateConnectionId,
  createValidationError
} from '../utils/validation';
import { logger } from '../../../utils/logger';
import { MetricsService } from './metrics.service';
import { ConnectionService } from './connection.service';
import { LoggingManager } from '../../../managers/utils/LoggingManager';

export class MessageHandler {
  private readonly metricsService: MetricsService;
  private readonly connectionService: ConnectionService;

  constructor(
    metricsService: MetricsService,
    connectionService: ConnectionService
  ) {
    this.metricsService = metricsService;
    this.connectionService = connectionService;
  }

  public async handleWebSocketMessage(
    ws: WebSocket,
    connectionId: ConnectionId,
    data: unknown
  ): Promise<void> {
    try {
      const message = validateAgentMessage(data);
      await this.handleMessage(message, ws, connectionId);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(ws, ERROR_CODES.MESSAGE_HANDLING_ERROR, 'Failed to handle message', error);
    }
  }

  public async handleSocketIOMessage(
    socket: Socket,
    connectionId: ConnectionId,
    data: unknown
  ): Promise<void> {
    try {
      const message = validateAgentMessage(data);
      await this.handleMessage(message, socket, connectionId);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(socket, ERROR_CODES.MESSAGE_HANDLING_ERROR, 'Failed to handle message', error);
    }
  }

  private async handleMessage(
    message: AgentMessage,
    connection: WebSocket | Socket,
    connectionId: ConnectionId
  ): Promise<void> {
    const startTime = Date.now();

    try {
      switch (message.type) {
        case 'register':
          await this.handleRegisterMessage(message, connection, connectionId);
          break;
        case 'heartbeat':
          await this.handleHeartbeatMessage(message, connection, connectionId);
          break;
        case 'metrics':
          await this.handleMetricsMessage(message, connection, connectionId);
          break;
        case 'command_response':
          await this.handleCommandResponseMessage(message, connection, connectionId);
          break;
        case 'error':
          await this.handleErrorMessage(message, connection, connectionId);
          break;
        default:
          const exhaustiveCheck: never = message;
          throw new Error(`Unhandled message type: ${(message as any).type}`);
      }

      this.metricsService.recordMessageHandlingTime(message.type, Date.now() - startTime);
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(connection, ERROR_CODES.MESSAGE_HANDLING_ERROR, 'Failed to handle message', error);
      this.metricsService.recordMessageError(message.type);
    }
  }

  private async handleRegisterMessage(
    message: ExtractMessage<'register'>,
    connection: WebSocket | Socket,
    connectionId: ConnectionId
  ): Promise<void> {
    const { payload: agentInfo } = message;
    
    try {
      const agentId = validateAgentId(agentInfo.id);
      await this.connectionService.registerAgent(agentId, connectionId, agentInfo);
      
      loggerLoggingManager.getInstance().();
      this.metricsService.recordAgentRegistration();
      
      this.sendSuccessResponse(connection, 'register', { agentId });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(connection, ERROR_CODES.REGISTRATION_ERROR, 'Failed to register agent', error);
      this.metricsService.recordRegistrationError();
    }
  }

  private async handleHeartbeatMessage(
    message: ExtractMessage<'heartbeat'>,
    connection: WebSocket | Socket,
    connectionId: ConnectionId
  ): Promise<void> {
    const { payload: metrics } = message;
    
    try {
      const agentId = await this.connectionService.getAgentIdByConnectionId(connectionId);
      await this.connectionService.updateAgentHeartbeat(agentId, metrics);
      
      loggerLoggingManager.getInstance().();
      this.metricsService.recordHeartbeat();
      
      this.sendSuccessResponse(connection, 'heartbeat', { agentId });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(connection, ERROR_CODES.HEARTBEAT_ERROR, 'Failed to process heartbeat', error);
      this.metricsService.recordHeartbeatError();
    }
  }

  private async handleMetricsMessage(
    message: ExtractMessage<'metrics'>,
    connection: WebSocket | Socket,
    connectionId: ConnectionId
  ): Promise<void> {
    const { payload: metrics } = message;
    
    try {
      const agentId = await this.connectionService.getAgentIdByConnectionId(connectionId);
      await this.metricsService.recordAgentMetrics(agentId, metrics);
      
      loggerLoggingManager.getInstance().();
      this.metricsService.recordMetricsUpdate();
      
      this.sendSuccessResponse(connection, 'metrics', { agentId });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(connection, ERROR_CODES.METRICS_ERROR, 'Failed to process metrics', error);
      this.metricsService.recordMetricsError();
    }
  }

  private async handleCommandResponseMessage(
    message: ExtractMessage<'command_response'>,
    connection: WebSocket | Socket,
    connectionId: ConnectionId
  ): Promise<void> {
    const { payload: commandResult } = message;
    
    try {
      const agentId = await this.connectionService.getAgentIdByConnectionId(connectionId);
      await this.connectionService.processCommandResponse(agentId, commandResult);
      
      loggerLoggingManager.getInstance().();
      this.metricsService.recordCommandResponse();
      
      this.sendSuccessResponse(connection, 'command_response', { agentId });
    } catch (error) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(connection, ERROR_CODES.COMMAND_ERROR, 'Failed to process command response', error);
      this.metricsService.recordCommandError();
    }
  }

  private async handleErrorMessage(
    message: ExtractMessage<'error'>,
    connection: WebSocket | Socket,
    connectionId: ConnectionId
  ): Promise<void> {
    const { payload: error } = message;
    
    try {
      const agentId = await this.connectionService.getAgentIdByConnectionId(connectionId);
      await this.connectionService.recordAgentError(agentId, error);
      
      loggerLoggingManager.getInstance().();
      this.metricsService.recordAgentError();
      
      this.sendSuccessResponse(connection, 'error', { agentId });
    } catch (err) {
      loggerLoggingManager.getInstance().();
      this.sendErrorResponse(connection, ERROR_CODES.ERROR_HANDLING_ERROR, 'Failed to process agent error', err);
      this.metricsService.recordErrorHandlingError();
    }
  }

  private sendSuccessResponse(
    connection: WebSocket | Socket,
    type: AgentMessage['type'],
    data: Record<string, unknown>
  ): void {
    const response = {
      type: `${type}_response` as const,
      success: true,
      data,
      timestamp: new Date().toISOString()
    };

    if (connection instanceof WebSocket) {
      connection.send(JSON.stringify(response));
    } else {
      connection.emit('message', response);
    }
  }

  private sendErrorResponse(
    connection: WebSocket | Socket,
    code: keyof typeof ERROR_CODES,
    message: string,
    details?: unknown
  ): void {
    const error = createValidationError(code, message, details);
    const response = {
      type: 'error' as const,
      success: false,
      error,
      timestamp: new Date().toISOString()
    };

    if (connection instanceof WebSocket) {
      connection.send(JSON.stringify(response));
    } else {
      connection.emit('message', response);
    }
  }
}


