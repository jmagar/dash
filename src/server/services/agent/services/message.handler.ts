import { WebSocket } from 'ws';
import { Socket } from 'socket.io';
import { ERROR_CODES } from '../../../utils/constants';
import { handleError } from '../utils/error.handler';
import { ApiError } from '../../../../../types/error';
import type { AgentMessage } from '../agent.types';
import { validateMessageByType } from '../utils/validation';
import { validateConnectionId } from '../utils/connection';
import { MetricsService } from './metrics.service';
import { ConnectionService } from './connection.service';
import type { RegisterMessage, HeartbeatMessage, MetricsMessage, CommandResponseMessage, ErrorMessage } from '../message.types';

type ExtractMessage<T extends AgentMessage['type']> = Extract<AgentMessage, { type: T }>;

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

  public async handleWebSocketMessage(message: unknown, ws: WebSocket, connectionId: string): Promise<void> {
    try {
      const validatedMessage = validateMessageByType(message, 'websocket');
      await this.handleMessage(validatedMessage, ws, connectionId);
    } catch (error) {
      await this.sendErrorResponse(ws, ERROR_CODES.INTERNAL_ERROR, 'Failed to handle message', error);
    }
  }

  public async handleSocketMessage(message: unknown, socket: Socket, connectionId: string): Promise<void> {
    try {
      const validatedMessage = validateMessageByType(message, 'socketio');
      await this.handleMessage(validatedMessage, socket, connectionId);
    } catch (error) {
      await this.sendErrorResponse(socket, ERROR_CODES.INTERNAL_ERROR, 'Failed to handle message', error);
    }
  }

  private async handleMessage(
    message: AgentMessage,
    connection: WebSocket | Socket,
    connectionId: string
  ): Promise<void> {
    try {
      validateConnectionId(connectionId);

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
        default: {
          const exhaustiveCheck: never = message;
          throw new Error(`Unhandled message type: ${exhaustiveCheck}`);
        }
      }
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        context: 'handle_message',
        connectionId
      });
      await this.sendErrorResponse(connection, ERROR_CODES.INTERNAL_ERROR, 'Failed to handle message', error);
    }
  }

  private async handleRegisterMessage(
    message: RegisterMessage,
    connection: WebSocket | Socket,
    connectionId: string
  ): Promise<void> {
    try {
      const { payload } = message;
      await this.sendSuccessResponse(connection, 'register', { registered: true });
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.VALIDATION_ERROR,
        context: 'register_agent',
        connectionId
      });
      await this.sendErrorResponse(connection, ERROR_CODES.VALIDATION_ERROR, 'Failed to register agent', error);
    }
  }

  private async handleHeartbeatMessage(
    message: HeartbeatMessage,
    connection: WebSocket | Socket,
    connectionId: string
  ): Promise<void> {
    try {
      const { payload } = message;
      await this.sendSuccessResponse(connection, 'heartbeat', { received: true });
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        context: 'heartbeat',
        connectionId
      });
      await this.sendErrorResponse(connection, ERROR_CODES.INTERNAL_ERROR, 'Failed to process heartbeat', error);
    }
  }

  private async handleMetricsMessage(
    message: MetricsMessage,
    connection: WebSocket | Socket,
    connectionId: string
  ): Promise<void> {
    try {
      const { payload } = message;
      await this.metricsService.updateMetrics(connectionId, payload);
      await this.sendSuccessResponse(connection, 'metrics', { received: true });
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        context: 'metrics',
        connectionId
      });
      await this.sendErrorResponse(connection, ERROR_CODES.INTERNAL_ERROR, 'Failed to process metrics', error);
    }
  }

  private async handleCommandResponseMessage(
    message: CommandResponseMessage,
    connection: WebSocket | Socket,
    connectionId: string
  ): Promise<void> {
    try {
      const { payload } = message;
      await this.sendSuccessResponse(connection, 'command_response', { received: true });
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.COMMAND_ERROR,
        context: 'command_response',
        connectionId
      });
      await this.sendErrorResponse(connection, ERROR_CODES.COMMAND_ERROR, 'Failed to process command response', error);
    }
  }

  private async handleErrorMessage(
    message: ErrorMessage,
    connection: WebSocket | Socket,
    connectionId: string
  ): Promise<void> {
    try {
      const { payload } = message;
      await this.sendSuccessResponse(connection, 'error', { received: true });
    } catch (error) {
      handleError(error, {
        code: ERROR_CODES.INTERNAL_ERROR,
        context: 'error_message',
        connectionId
      });
      await this.sendErrorResponse(connection, ERROR_CODES.INTERNAL_ERROR, 'Failed to process error message', error);
    }
  }

  public async sendSuccessResponse(connection: WebSocket | Socket, type: AgentMessage['type'], payload: Record<string, unknown>): Promise<void> {
    const response = {
      type,
      success: true,
      payload,
    };
    if (connection instanceof WebSocket) {
      await connection.send(JSON.stringify(response));
    } else {
      await connection.emit(type, response);
    }
  }

  public async sendErrorResponse(
    connection: WebSocket | Socket,
    code: keyof typeof ERROR_CODES,
    message: string,
    details?: unknown
  ): Promise<void> {
    const errorResponse = {
      type: 'error',
      success: false,
      error: {
        code,
        message,
        details: details instanceof Error ? details.message : details
      },
      timestamp: new Date().toISOString()
    };

    if (connection instanceof WebSocket) {
      await connection.send(JSON.stringify(errorResponse));
    } else {
      await connection.emit('error', errorResponse);
    }
  }
}
