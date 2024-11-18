const defaultConfig = require('./default');
const productionConfig = require('./production');
const developmentConfig = require('./development');

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      deepMerge(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
  return target;
}

const env = process.env.NODE_ENV || 'development';
let envConfig = {};

if (env === 'production') {
  envConfig = productionConfig;
} else if (env === 'development') {
  envConfig = developmentConfig;
}

// Merge default config with environment-specific config
const config = deepMerge(defaultConfig, envConfig);

// Validate required configurations
function validateConfig(config) {
  const required = [
    'database.user',
    'database.password',
    'auth.jwtSecret',
  ];

  for (const path of required) {
    const value = path.split('.').reduce((obj, key) => obj && obj[key], config);
    if (!value) {
      throw new Error(`Missing required configuration: ${path}`);
    }
  }
}

// Only validate in production
if (env === 'production') {
  validateConfig(config);
}

module.exports = config;
