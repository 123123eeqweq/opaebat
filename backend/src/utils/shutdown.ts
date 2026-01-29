/**
 * Graceful shutdown utility
 */

import type { FastifyInstance } from 'fastify';
import { shutdownAll } from '../bootstrap/index.js';
import { logger } from '../shared/logger.js';

export function setupGracefulShutdown(app: FastifyInstance): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // Close Fastify server
      await app.close();

      // Shutdown all systems (database, redis, etc.)
      await shutdownAll();

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle SIGTERM (Docker, Kubernetes, etc.)
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}
