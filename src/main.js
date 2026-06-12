'use strict';

const { startClient } = require('./whatsapp/client');
const logger = require('./utils/logger');

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  // Jangan crash — biarkan proses tetap jalan
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

logger.info('Bot starting...');
startClient();
