// Auth API
export { login, logout, validate } from './auth.client';

// File Explorer API
export { listFiles, readFile, writeFile, deleteFile } from './fileExplorer.client';

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
export {
  listPackages,
  listInstalledPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  searchPackages,
} from './packageManager.client';

// Remote Execution API
export {
  executeCommand,
  getCommandStatus,
  cancelCommand,
} from './remoteExecution.client';

// Export the API client
export { api } from './api';
