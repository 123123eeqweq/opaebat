/**
 * WebSocket bootstrap - WebSocket server initialization
 */

import type { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { registerWebSocketRoutes, getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import { logger } from '../shared/logger.js';

let wsInitialized = false;

export async function initWebSocket(app: FastifyInstance): Promise<void> {
  if (wsInitialized) {
    logger.warn('WebSocket already initialized');
    return;
  }

  logger.info('Initializing WebSocket server...');

  try {
    // Register WebSocket plugin with compression
    await app.register(fastifyWebsocket, {
      options: {
        perMessageDeflate: true,
        maxPayload: 64 * 1024, // 64KB max message size
      },
    });

    // Register WebSocket routes
    await registerWebSocketRoutes(app);

    // Start heartbeat for keep-alive (ping clients every 30s)
    getWebSocketManager().startHeartbeat();

    wsInitialized = true;
    logger.info('✅ WebSocket server initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize WebSocket server:', error);
    throw error;
  }
}

export function isWebSocketInitialized(): boolean {
  return wsInitialized;
}
