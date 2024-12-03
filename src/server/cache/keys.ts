export const CACHE_KEYS = {
  FILESYSTEM: {
    CONTEXT: 'context:filesystem',
    EVENTS: 'context:filesystem:events',
    WATCHERS: 'context:filesystem:watchers',
    USAGE: 'context:filesystem:usage',
    RECENT: 'context:filesystem:recent'
  },
  PROCESS: {
    CONTEXT: 'context:process',
    METRICS: 'context:process:metrics',
    RESOURCES: 'context:process:resources',
    SERVICES: 'context:process:services'
  },
  NETWORK: {
    CONTEXT: 'context:network',
    CONNECTIONS: 'context:network:connections',
    INTERFACES: 'context:network:interfaces',
    METRICS: 'context:network:metrics'
  },
  USER: {
    CONTEXT: 'context:user',
    ACTIVITY: 'context:user:activity',
    PREFERENCES: 'context:user:preferences',
    WORKFLOWS: 'context:user:workflows',
    ERRORS: 'context:user:errors'
  },
  APP: {
    CONTEXT: 'context:app',
    METRICS: 'context:app:metrics',
    HEALTH: 'context:app:health',
    FEATURES: 'context:app:features',
    ERRORS: 'context:app:errors'
  },
  SYSTEM: {
    CONTEXT: 'context:system',
    EVENTS: 'context:system:events',
    ALERTS: 'context:system:alerts',
    DEPENDENCIES: 'context:system:dependencies'
  }
} as const;

export const CACHE_TTL = {
  FILESYSTEM: {
    CONTEXT: 3600000,     // 1 hour
    EVENTS: 3600000,      // 1 hour
    WATCHERS: 3600000,    // 1 hour
    USAGE: 1800000,       // 30 minutes
    RECENT: 3600000       // 1 hour
  },
  PROCESS: {
    CONTEXT: 3600000,     // 1 hour
    METRICS: 300000,      // 5 minutes
    RESOURCES: 300000,    // 5 minutes
    SERVICES: 1800000     // 30 minutes
  },
  NETWORK: {
    CONTEXT: 3600000,     // 1 hour
    CONNECTIONS: 300000,  // 5 minutes
    INTERFACES: 1800000,  // 30 minutes
    METRICS: 300000       // 5 minutes
  },
  USER: {
    CONTEXT: 86400000,    // 24 hours
    ACTIVITY: 1800000,    // 30 minutes
    PREFERENCES: 86400000,// 24 hours
    WORKFLOWS: 86400000,  // 24 hours
    ERRORS: 86400000      // 24 hours
  },
  APP: {
    CONTEXT: 3600000,     // 1 hour
    METRICS: 300000,      // 5 minutes
    HEALTH: 300000,       // 5 minutes
    FEATURES: 86400000,   // 24 hours
    ERRORS: 86400000      // 24 hours
  },
  SYSTEM: {
    CONTEXT: 3600000,     // 1 hour
    EVENTS: 3600000,      // 1 hour
    ALERTS: 1800000,      // 30 minutes
    DEPENDENCIES: 86400000// 24 hours
  }
} as const;
