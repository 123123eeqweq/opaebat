/**
 * WebSocket routes
 */

import type { FastifyInstance } from 'fastify';
import { WebSocketManager } from '../../shared/websocket/WebSocketManager.js';
import { WsClient } from '../../shared/websocket/WsClient.js';
import { authenticateWebSocket } from '../../infrastructure/websocket/WsAuthAdapter.js';
import { logger } from '../../shared/logger.js';

let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export async function registerWebSocketRoutes(app: FastifyInstance): Promise<void> {
  const manager = getWebSocketManager();

  app.get('/ws', { websocket: true }, async (socket, request) => {
    const client = new WsClient(socket);

    // Authenticate
    const userId = await authenticateWebSocket(request);
    if (!userId) {
      logger.warn('WebSocket connection rejected: authentication failed');
      client.close();
      return;
    }

    // Set user ID and authenticate
    client.userId = userId;
    client.isAuthenticated = true;

    // Register client
    manager.register(client);

    logger.info(`WebSocket client connected: ${userId}`);

    // Handle messages
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping
        if (data.type === 'ping') {
          client.send({ type: 'server:time', data: { timestamp: Date.now() } });
          return;
        }

        // FLOW WS-SUBSCRIBE: клиент подписывается на конкретный инструмент
        if (data.type === 'subscribe' && typeof data.instrument === 'string') {
          client.instrument = data.instrument;
          logger.debug(
            `WebSocket client ${userId} subscribed to instrument ${data.instrument}`,
          );
          return;
        }
      } catch (error) {
        logger.error('Failed to parse WS message:', error);
      }
    });

    // Handle close
    socket.on('close', () => {
      logger.info(`WebSocket client disconnected: ${userId}`);
      manager.unregister(client);
    });

    // Handle error
    socket.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
      manager.unregister(client);
    });

    // Send initial server time
    try {
      client.send({ type: 'server:time', data: { timestamp: Date.now() } });
    } catch (error) {
      logger.error('Failed to send initial server time:', error);
    }
  });

  logger.info('WebSocket routes registered');
}
