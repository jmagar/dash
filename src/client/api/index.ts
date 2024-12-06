// Auth API
export * from './auth.client';

// File Explorer API
export * from './fileExplorer.client';

// Docker API
export {
  listContainers,
  createContainer,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  inspectContainer,
  getContainerStats,
  getContainerLogs,
} from './docker.client';

// Hosts API
export {
  listHosts,
  getHost,
  createHost,
  updateHost,
  deleteHost,
  testHost,
  getHostStats,
  connectHost,
  disconnectHost,
} from './hosts.client';

// Package Manager API
export * from './packageManager.client';

// Remote Execution API
export * from './remoteExecution.client';

// Chat API
export * from './chat.client';

// Preferences API
export * from './preferences.client';

// Export the API client
export { api } from './api';
