/**
 * System bootstrap - Initialize all core systems
 */

import type { FastifyInstance } from 'fastify';
import { connectDatabase, disconnectDatabase } from './database.js';
import { connectRedis, disconnectRedis } from './redis.js';
import { initWebSocket } from './websocket.js';
import { bootstrapPrices, shutdownPrices } from './prices.bootstrap.js';
import { bootstrapTrades, shutdownTrades } from './trades.bootstrap.js';
import { shutdownWebSocketEvents } from './websocket.bootstrap.js';
import { bootstrapTimeUpdates, shutdownTimeUpdates } from './time.bootstrap.js';
import { registerBullBoard } from '../jobs/board.js';
import { logger } from '../shared/logger.js';

export async function bootstrapAll(app: FastifyInstance): Promise<void> {
  logger.info('🚀 Starting system bootstrap...');

  try {
    // Initialize database
    await connectDatabase();

    // Initialize in-memory store (prices, active candles)
    await connectRedis();

    // Initialize WebSocket
    await initWebSocket(app);

    // Initialize price engine
    await bootstrapPrices();

    // Initialize trade closing service
    await bootstrapTrades();

    // Initialize time updates (countdown)
    await bootstrapTimeUpdates();

    // Bull Board UI (when REDIS_URL is set)
    await registerBullBoard(app);

    logger.info('✅ System bootstrap completed successfully');
  } catch (error) {
    logger.error('❌ System bootstrap failed:', error);
    await shutdownAll();
    throw error;
  }
}

export async function shutdownAll(): Promise<void> {
  logger.info('🛑 Shutting down all systems...');

  try {
    await shutdownTrades();
    await shutdownTimeUpdates();
    await shutdownWebSocketEvents();
    await shutdownPrices();
    await disconnectDatabase();
    await disconnectRedis();
    logger.info('✅ All systems shut down successfully');
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    throw error;
  }
}
