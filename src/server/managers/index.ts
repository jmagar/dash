// Import all managers
import { ConfigManager } from './ConfigManager';
import { MetricsManager } from './MetricsManager';
import { SecurityManager } from './SecurityManager';
import { LoggingManager } from './LoggingManager';
import { MonitoringManager } from './MonitoringManager';
import { AgentManager } from './AgentManager';
import { CacheManager } from './CacheManager';
import { DatabaseManager } from './DatabaseManager';
import { FileSystemManager } from './FileSystemManager';
import { RequestManager } from './RequestManager';
import { ServiceManager } from './ServiceManager';
import { StateManager } from './StateManager';
import { TaskManager } from './TaskManager';
import { WebSocketManager } from './WebSocketManager';

// Import the manager container
import { managerContainer } from './ManagerContainer';

// Initialize all managers
export function initializeManagers(): void {
  // Initialize the manager container
  managerContainer.initializeAll();
}

// Export individual managers for direct use if needed
export {
  ConfigManager,
  MetricsManager,
  SecurityManager,
  LoggingManager,
  MonitoringManager,
  AgentManager,
  CacheManager,
  DatabaseManager,
  FileSystemManager,
  RequestManager,
  ServiceManager,
  StateManager,
  TaskManager,
  WebSocketManager,
  managerContainer
};
