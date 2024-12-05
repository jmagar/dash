// Cache TTL values (in seconds)
export const CACHE_TTL = 3600; // 1 hour
export const STALE_THRESHOLD = 300000; // 5 minutes
export const CONNECTION_TIMEOUT = 5000; // 5 seconds

// WebSocket event names
export const WS_EVENTS = {
  MESSAGE: 'message',
  ERROR: 'error',
  CLOSE: 'close',
  PING: 'ping',
  PONG: 'pong'
} as const;

// Socket.IO event names
export const SOCKET_EVENTS = {
  REGISTER: 'agent:register',
  HEARTBEAT: 'agent:heartbeat',
  COMMAND_RESPONSE: 'agent:command_response',
  ERROR: 'agent:error',
  DISCONNECT: 'agent:disconnect',
  PING: 'agent:ping',
  PONG: 'agent:pong',
  HANDSHAKE: 'agent:handshake',
  COMMAND: 'agent:command',
  METRICS: 'agent:metrics'
} as const;

// Error codes
export const ERROR_CODES = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  COMMAND_ERROR: 'COMMAND_ERROR'
} as const;

// Log metadata keys
export const LOG_METADATA = {
  AGENT_ID: 'agentId',
  CONNECTION_TYPE: 'connectionType',
  ERROR: 'error',
  MESSAGE_TYPE: 'messageType',
  SOCKET_ID: 'socketId'
} as const;
