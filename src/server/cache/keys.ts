export const CACHE_KEYS = {
  // Existing keys
  HOST: 'host',
  SESSION: 'session',
  COMMAND: 'command',
  DOCKER: {
    CONTAINERS: 'docker:containers',
    STACKS: 'docker:stacks',
    IMAGES: 'docker:images',
    NETWORKS: 'docker:networks',
    VOLUMES: 'docker:volumes'
  },

  // New context keys
  FILESYSTEM: {
    EVENTS: 'fs:events',
    WATCHERS: 'fs:watchers',
    USAGE: 'fs:usage',
    RECENT: 'fs:recent'
  },
  PROCESS: {
    METRICS: 'process:metrics',
    RESOURCES: 'process:resources',
    SERVICES: 'process:services'
  },
  NETWORK: {
    METRICS: 'network:metrics',
    CONNECTIONS: 'network:connections',
    INTERFACES: 'network:interfaces',
    SSH: 'network:ssh'
  },
  USER: {
    ACTIVITY: 'user:activity',
    PREFERENCES: 'user:preferences',
    WORKFLOWS: 'user:workflows',
    ERRORS: 'user:errors'
  },
  APP: {
    METRICS: 'app:metrics',
    HEALTH: 'app:health',
    FEATURES: 'app:features',
    ERRORS: 'app:errors'
  },
  SYSTEM: {
    EVENTS: 'system:events',
    ALERTS: 'system:alerts',
    DEPENDENCIES: 'system:dependencies'
  }
} as const;

export const CACHE_TTL = {
  // Existing TTLs
  HOST: 3600,
  SESSION: 86400,
  COMMAND: 3600,
  DOCKER: {
    CONTAINERS: 60,
    STACKS: 300,
    IMAGES: 3600,
    NETWORKS: 300,
    VOLUMES: 300
  },

  // New context TTLs
  FILESYSTEM: {
    EVENTS: 3600,
    WATCHERS: 300,
    USAGE: 300,
    RECENT: 1800
  },
  PROCESS: {
    METRICS: 60,
    RESOURCES: 60,
    SERVICES: 300
  },
  NETWORK: {
    METRICS: 60,
    CONNECTIONS: 30,
    INTERFACES: 300,
    SSH: 1800
  },
  USER: {
    ACTIVITY: 86400,
    PREFERENCES: 86400,
    WORKFLOWS: 86400,
    ERRORS: 86400
  },
  APP: {
    METRICS: 300,
    HEALTH: 60,
    FEATURES: 3600,
    ERRORS: 3600
  },
  SYSTEM: {
    EVENTS: 86400,
    ALERTS: 3600,
    DEPENDENCIES: 3600
  }
} as const;
