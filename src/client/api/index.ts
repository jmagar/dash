// Auth API
export * from './auth.client';

// File Explorer API
export * from './fileExplorer.client';

// Docker API
export {
  listContainers,
  getContainerLogs,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  getContainerStats,
  getStacks,
  createStack,
  deleteStack,
  startStack,
  stopStack,
  getStackComposeFile,
  updateStackComposeFile,
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

// Export the API client
export { api } from './api';
