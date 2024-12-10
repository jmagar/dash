// Import only from types directory
import type { Host } from './models-shared';
import { LogLevel } from './logger';

// Connection state type
export type ConnectionState = 'connected' | 'disconnected' | 'error' | 'reconnecting';

// Service context type (moved from server)
export interface ServiceContext {
  id: string;
  timestamp: Date;
  userId?: string;
  hostId?: string;
  metadata: Record<string, unknown>;
}

// File system types
export interface FileSystemState {
  currentDirectory: string;
  recentFiles: Array<FileInfo>;
  watchedDirectories: Array<WatchedDirectory>;
  mountPoints: Array<MountPoint>;
}

export interface FileInfo {
  path: string;
  lastAccessed: Date;
  size: number;
  type?: 'file' | 'directory' | 'symlink';
  permissions?: string;
}

export interface WatchedDirectory {
  path: string;
  lastChange: Date;
  events?: Array<'create' | 'modify' | 'delete'>;
}

export interface MountPoint {
  path: string;
  usage: {
    total: number;
    used: number;
    available: number;
  };
  type?: string;
  options?: string[];
}

// Docker types
export interface DockerState {
  containers: Array<DockerContainer>;
  images: Array<DockerImage>;
  networks: Array<DockerNetwork>;
  volumes: Array<DockerVolume>;
  stacks: Array<DockerStack>;
}

export interface DockerContainer {
  id: string;
  name: string;
  status: DockerContainerStatus;
  image: string;
  ports: string[];
  created: Date;
  state: string;
}

export type DockerContainerStatus = 'running' | 'stopped' | 'paused' | 'exited' | 'created' | 'restarting' | 'removing' | 'dead';

export interface DockerImage {
  id: string;
  tags: string[];
  size: number;
  created: Date;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
}

export interface DockerVolume {
  name: string;
  mountpoint: string;
  driver: string;
}

export interface DockerStack {
  name: string;
  services: string[];
  status: 'active' | 'inactive' | 'error';
}

// Log types
export interface LogState {
  recentLogs: Array<LogEntry>;
  errorCount: LogErrorCount;
  logFiles: Array<LogFile>;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface LogErrorCount {
  last1h: number;
  last24h: number;
  total: number;
}

export interface LogFile {
  path: string;
  size: number;
  lastModified: Date;
}

// Process types
export interface ProcessState {
  running: Array<RunningProcess>;
  systemLoad: SystemLoad;
  memory: MemoryState;
}

export interface RunningProcess {
  pid: number;
  command: string;
  cpu: number;
  memory: number;
  started: Date;
}

export interface SystemLoad {
  '1m': number;
  '5m': number;
  '15m': number;
}

export interface MemoryState {
  total: number;
  used: number;
  free: number;
  cached: number;
}

// Network types
export interface NetworkState {
  connections: Array<NetworkConnection>;
  interfaces: Array<NetworkInterface>;
}

export interface NetworkConnection {
  local: string;
  remote: string;
  state: NetworkConnectionState;
  pid?: number;
}

export type NetworkConnectionState = 'established' | 'listening' | 'closed' | 'time_wait';

export interface NetworkInterface {
  name: string;
  addresses: string[];
  stats: NetworkStats;
}

export interface NetworkStats {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

// System state
export interface SystemState {
  cacheStatus: CacheStatus;
  dbStatus: DatabaseStatus;
  activeHosts: Host[];
  metrics: SystemMetrics;
  fileSystem: FileSystemState;
  docker: DockerState;
  logs: LogState;
  processes: ProcessState;
  network: NetworkState;
}

export interface CacheStatus {
  connected: boolean;
  state: ConnectionState;
  memoryUsage: number;
  totalKeys: number;
}

export interface DatabaseStatus {
  connected: boolean;
  poolSize: number;
  activeConnections: number;
}

export interface SystemMetrics {
  systemLoad: number;
  memoryUsage: number;
  activeUsers: number;
}

// Chatbot context
export interface ChatbotContext {
  serviceContext: ServiceContext;
  systemState: SystemState;
  lastQuery?: QueryInfo;
  metadata: Record<string, unknown>;
}

export interface QueryInfo {
  timestamp: Date;
  query: string;
  result: unknown;
}

export interface ContextProvider {
  getCurrentContext(): Promise<ChatbotContext>;
  updateContext(partial: Partial<ChatbotContext>): void;
  clearContext(): void;
}

// Type guards
export function isDockerContainer(obj: unknown): obj is DockerContainer {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'status' in obj &&
    'image' in obj;
}

export function isLogEntry(obj: unknown): obj is LogEntry {
  return obj !== null &&
    typeof obj === 'object' &&
    'timestamp' in obj &&
    'level' in obj &&
    'message' in obj;
}

export function isRunningProcess(obj: unknown): obj is RunningProcess {
  return obj !== null &&
    typeof obj === 'object' &&
    'pid' in obj &&
    'command' in obj &&
    'cpu' in obj &&
    'memory' in obj &&
    'started' in obj;
}

export function isNetworkInterface(obj: unknown): obj is NetworkInterface {
  return obj !== null &&
    typeof obj === 'object' &&
    'name' in obj &&
    'addresses' in obj &&
    'stats' in obj;
}

// Error types
export interface ChatbotError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

export const CHATBOT_ERROR_CODES = {
  CONTEXT_ERROR: 'CONTEXT_ERROR',
  STATE_ERROR: 'STATE_ERROR',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;
