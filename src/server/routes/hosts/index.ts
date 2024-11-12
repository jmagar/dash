import router from './routes';

// Re-export types
export * from './types';

// Re-export pool utilities
export {
  getConnection,
  closeConnection,
  testSSHConnection,
  CONNECTION_TIMEOUT,
  KEEP_ALIVE_INTERVAL,
  KEEP_ALIVE_COUNT_MAX,
} from './pool';

// Re-export monitoring utilities
export {
  startHostMonitoring,
  stopHostMonitoring,
  getMonitoringStatus,
  getMonitoredHosts,
} from './monitoring';

// Re-export service functions with renamed exports
export {
  listHosts as listHostsService,
  getHost as getHostService,
  createHost as createHostService,
  updateHost as updateHostService,
  deleteHost as deleteHostService,
  testHost as testHostService,
} from './service';

// Re-export controller functions with renamed exports
export {
  listHosts as listHostsController,
  getHost as getHostController,
  createHost as createHostController,
  updateHost as updateHostController,
  deleteHost as deleteHostController,
  testHost as testHostController,
  testConnection as testConnectionController,
} from './controller';

export default router;
