'use strict';

const path = require('path');
const { requestLogger } = require(path.join(__dirname, '..', '..', 'src', 'utils', 'logger'));

module.exports = requestLogger;
