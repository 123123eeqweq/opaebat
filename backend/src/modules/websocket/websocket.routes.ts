/**
 * WebSocket routes
 */

import type { FastifyInstance } from 'fastify';
import { WebSocketManager } from '../../shared/websocket/WebSocketManager.js';
import { WsClient } from '../../shared/websocket/WsClient.js';
import { authenticateWebSocket } from '../../infrastructure/websocket/WsAuthAdapter.js';
import { logger } from '../../shared/logger.js';
import { WS_RATE_LIMIT_MAX, WS_RATE_LIMIT_WINDOW_MS } from '../../config/constants.js';

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

    logger.info(`WebSocket client connected: ${userId}, sessionId: ${client.sessionId}`);

    // FLOW WS-1.0: Отправляем ws:ready сразу после регистрации
    try {
      client.send({
        type: 'ws:ready',
        sessionId: client.sessionId,
        serverTime: Date.now(),
      });
    } catch (error) {
      logger.error('Failed to send ws:ready:', error);
    }

    // Handle messages
    socket.on('message', (message: Buffer) => {
      try {
        const rawMessage = message.toString();
        const data = JSON.parse(rawMessage) as import('../../shared/websocket/WsEvents.js').WsClientMessage;

        // Handle ping (doesn't count toward rate limit - keep-alive)
        if (data.type === 'ping') {
          client.send({ type: 'server:time', data: { timestamp: Date.now() } });
          return;
        }

        // Rate limit: check message count per client (excluding ping)
        const now = Date.now();
        if (now - client.rateLimitWindowStart > WS_RATE_LIMIT_WINDOW_MS) {
          client.messageCount = 0;
          client.rateLimitWindowStart = now;
        }
        client.messageCount++;
        if (client.messageCount > WS_RATE_LIMIT_MAX) {
          logger.warn(`WebSocket rate limit exceeded for user ${userId}`);
          client.send({ type: 'server:time', data: { timestamp: Date.now(), rateLimited: true } });
          return;
        }

        // FLOW WS-1.1: subscribe - добавляем в Set подписок
        if (data.type === 'subscribe' && typeof data.instrument === 'string') {
          client.subscriptions.add(data.instrument);
          
          logger.debug(`🔔 Client ${userId} subscribed to ${data.instrument}`);
          
          // Отправляем подтверждение подписки
          client.send({ 
            type: 'subscribed', 
            instrument: data.instrument,
          });
          return;
        }
        
        // FLOW WS-1.1: unsubscribe - удаляем из Set
        if (data.type === 'unsubscribe' && typeof data.instrument === 'string') {
          client.subscriptions.delete(data.instrument);
          
          logger.debug(`🔕 Client ${userId} unsubscribed from ${data.instrument}`);
          
          client.send({
            type: 'unsubscribed',
            instrument: data.instrument,
          });
          return;
        }
        
        // FLOW WS-1.1: unsubscribe_all - очищаем все подписки
        if (data.type === 'unsubscribe_all') {
          const instruments = Array.from(client.subscriptions);
          client.subscriptions.clear();
          
          logger.debug(`🔕 Client ${userId} unsubscribed from all instruments`);
          
          // Отправляем подтверждения для каждого инструмента
          instruments.forEach(instrument => {
            client.send({
              type: 'unsubscribed',
              instrument,
            });
          });
          return;
        }
      } catch (error) {
        logger.error('Failed to parse WS message:', error);
      }
    });

    // Handle close
    socket.on('close', () => {
      logger.info(`WebSocket client disconnected: ${userId}, sessionId: ${client.sessionId}`);
      manager.unregister(client);
    });

    // Handle error
    socket.on('error', (error: Error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
      manager.unregister(client);
    });
  });

  logger.info('WebSocket routes registered');
}
