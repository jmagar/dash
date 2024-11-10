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
  getContainers,
  getContainerLogs,
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
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
  removeHost,
  getHostStatus,
  testConnection,
  getSystemStats,
  connectHost,
  disconnectHost,
} from './hosts.client';

// Package Manager API
export {
  type Package,
  listInstalledPackages,
  searchPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  getPackageInfo,
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
