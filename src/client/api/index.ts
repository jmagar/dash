// Auth API
export {
  login,
  logout,
  register,
  updateUser,
  validateToken,
  refreshToken,
} from './auth.client';

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

// File Explorer API
export {
  listFiles,
  readFile,
  writeFile,
  deleteFile,
  createDirectory,
} from './fileExplorer.client';

// Hosts API
export {
  listHosts,
  addHost,
  updateHost,
  deleteHost,
  testConnection,
  getHostStatus,
  connectHost,
  disconnectHost,
} from './hosts.client';

// Package Manager API
export {
  searchPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  getPackageInfo,
  listInstalledPackages,
} from './packageManager.client';

// Remote Execution API
export {
  executeCommand,
  executeScript,
  getCommandHistory,
  getSavedCommands,
  saveCommand,
  deleteSavedCommand,
} from './remoteExecution.client';
