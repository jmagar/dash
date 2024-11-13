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
} from './hosts.client';

// Package Manager API
export {
  searchPackages,
  installPackage,
  uninstallPackage,
  updatePackage,
  getPackageInfo,
} from './packageManager.client';

// Remote Execution API
export {
  executeScript,
  deleteSavedCommand,
} from './remoteExecution.client';
