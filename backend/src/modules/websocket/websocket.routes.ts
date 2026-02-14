/**
 * WebSocket routes
 */

import type { FastifyInstance } from 'fastify';
import { WebSocketManager } from '../../shared/websocket/WebSocketManager.js';
import { WsClient } from '../../shared/websocket/WsClient.js';
import { authenticateWebSocket } from '../../infrastructure/websocket/WsAuthAdapter.js';
import { logger } from '../../shared/logger.js';
import { WS_RATE_LIMIT_MAX, WS_RATE_LIMIT_WINDOW_MS } from '../../config/constants.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';

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
          client.send({ type: 'error', message: 'Rate limit exceeded. Please slow down.' });
          return;
        }

        // FLOW WS-1.1: subscribe - добавляем в Set подписок
        if (data.type === 'subscribe' && typeof data.instrument === 'string') {
          client.subscriptions.add(data.instrument);
          // 🔥 FLOW WS-TF: Сохраняем активный таймфрейм (для фильтрации candle:close и snapshot)
          if (typeof data.timeframe === 'string') {
            client.activeTimeframe = data.timeframe;
          }
          
          logger.debug(`🔔 Client ${userId} subscribed to ${data.instrument} (tf: ${client.activeTimeframe ?? 'all'})`);
          
          // Отправляем подтверждение подписки
          client.send({ 
            type: 'subscribed', 
            instrument: data.instrument,
          });

          // FLOW CANDLE-SNAPSHOT: Отправляем снапшот активной свечи при подписке
          // 🔥 FLOW WS-TF: Только для активного таймфрейма (если указан)
          sendActiveCandleSnapshot(client, data.instrument, client.activeTimeframe).catch((error) => {
            logger.error(`Failed to send candle snapshot for ${data.instrument}:`, error);
          });
          return;
        }
        
        // FLOW WS-1.1: unsubscribe - удаляем из Set
        if (data.type === 'unsubscribe' && typeof data.instrument === 'string') {
          client.subscriptions.delete(data.instrument);
          if (client.subscriptions.size === 0) {
            client.activeTimeframe = null;
          }
          
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
          client.activeTimeframe = null;
          
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

/**
 * FLOW CANDLE-SNAPSHOT: Отправляет снапшот активной (незакрытой) свечи клиенту
 * 🔥 FLOW WS-TF: Если указан timeframe — отправляет только эту свечу (не все таймфреймы)
 */
async function sendActiveCandleSnapshot(client: WsClient, instrument: string, timeframe: string | null): Promise<void> {
  try {
    const manager = getPriceEngineManager();
    const activeCandles = await manager.getActiveCandles(instrument);

    if (activeCandles.size === 0) {
      return; // Нет активных свечей — ничего отправлять
    }

    // 🔥 FLOW WS-TF: Фильтруем по таймфрейму — отправляем только нужную свечу
    let candlesArray: Array<{ timeframe: string; candle: any }>;
    if (timeframe && activeCandles.has(timeframe)) {
      candlesArray = [{ timeframe, candle: activeCandles.get(timeframe)! }];
    } else {
      // Fallback: если таймфрейм не указан или нет такой свечи — отправляем все
      candlesArray = Array.from(activeCandles.entries()).map(([tf, candle]) => ({
        timeframe: tf,
        candle,
      }));
    }

    client.send({
      instrument,
      type: 'candle:snapshot',
      data: { candles: candlesArray },
    });

    logger.debug(`📸 Sent candle snapshot to client for ${instrument}: ${candlesArray.map(c => c.timeframe).join(', ')}`);
  } catch (error) {
    logger.warn(`[sendActiveCandleSnapshot] Failed for ${instrument}:`, error);
  }
}
