module.exports = {
  server: {
    port: 3000,
  },

  database: {
    ssl: false,
  },

  security: {
    cors: {
      // More permissive CORS in development
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    rateLimit: {
      // More lenient rate limiting in development
      window: 60 * 1000, // 1 minute
      max: 1000,
    },
  },

  monitoring: {
    logLevel: 'debug', // More verbose logging in development
  },
};
