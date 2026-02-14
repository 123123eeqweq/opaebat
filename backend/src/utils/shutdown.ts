/**
 * Graceful shutdown utility
 */

import type { FastifyInstance } from 'fastify';
import { shutdownAll } from '../bootstrap/index.js';
import { getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import { logger } from '../shared/logger.js';

export function setupGracefulShutdown(app: FastifyInstance): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      // 1. Close all WebSocket connections (send shutdown message, then close)
      const wsManager = getWebSocketManager();
      wsManager.closeAll();

      // 2. Shutdown event handlers, prices, trades, etc. (before app.close)
      await shutdownAll();

      // 3. Close Fastify HTTP server
      await app.close();

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
