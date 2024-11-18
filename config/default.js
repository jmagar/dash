module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    maxRequestSize: 10 * 1024 * 1024, // 10MB
  },

  database: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'shh',
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '1h',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  security: {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
    },
    rateLimit: {
      window: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
  },

  monitoring: {
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9090'),
    logLevel: process.env.LOG_LEVEL || 'info',
    syslogPort: 1514,
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      organization: process.env.OPENAI_ORG,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-2',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
      maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
    },
  },

  notifications: {
    gotify: {
      url: process.env.GOTIFY_URL,
      token: process.env.GOTIFY_TOKEN,
    },
  },
};
