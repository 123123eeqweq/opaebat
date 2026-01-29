/**
 * Server entrypoint
 */

// Load environment variables first
import 'dotenv/config';

import { createApp } from './app.js';
import { bootstrapAll } from './bootstrap/index.js';
import { setupGracefulShutdown } from './utils/shutdown.js';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';

async function start() {
  try {
    logger.info('🚀 Starting server...');

    // Create Fastify app
    const app = await createApp();

    // Bootstrap all systems
    await bootstrapAll(app);

    // Setup graceful shutdown
    setupGracefulShutdown(app);

    // Start server
    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`✅ Server listening on ${address}`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
