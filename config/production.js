module.exports = {
  security: {
    cors: {
      // In production, specify exact origins
      origin: process.env.CORS_ORIGIN,
    },
    rateLimit: {
      // Stricter rate limiting in production
      window: 5 * 60 * 1000, // 5 minutes
      max: 50,
    },
  },

  monitoring: {
    logLevel: 'warn', // Less verbose logging in production
  },
};
