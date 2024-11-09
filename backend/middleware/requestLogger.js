'use strict';

const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  // Start timer
  const start = Date.now();

  // Log incoming request
  logger.info(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // Override end to calculate duration
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;

    // Log response using helper method
    logger.httpRequest(req, res, duration);

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = requestLogger;
