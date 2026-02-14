/**
 * WebSocket events bootstrap - connects event sources to WebSocket
 * FLOW P5: events scoped by instrument. Each message: { instrument, type, data }
 */

import { getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import type { PriceEngineManager } from '../prices/PriceEngineManager.js';
import { logger } from '../shared/logger.js';
import type { TradeDTO } from '../domain/trades/TradeTypes.js';

let unsubscribeHandlers: Array<() => void> = [];

export async function bootstrapWebSocketEvents(
  manager: PriceEngineManager,
): Promise<void> {
  if (unsubscribeHandlers.length > 0) {
    logger.warn('WebSocket events already bootstrapped');
    return;
  }

  logger.info('🚀 Bootstrapping WebSocket events (per-instrument)...');

  const wsManager = getWebSocketManager();
  const instrumentIds = manager.getInstrumentIds();

  for (const instrumentId of instrumentIds) {
    const eventBus = manager.getEventBus(instrumentId);
    if (!eventBus) continue;

    // 🔥 FLOW WS-BINARY: Pre-compute instrument header (constant per instrument)
    // Binary format: [0x01][instrLen:1][instrument:ASCII][price:Float64BE][timestamp:Float64BE]
    // Example: BTCUSD → 1 + 1 + 6 + 8 + 8 = 24 bytes (was 112 bytes JSON)
    const instrBuf = Buffer.from(instrumentId, 'ascii');
    const headerSize = 2 + instrBuf.length;
    const tickBufSize = headerSize + 16; // + price(8) + timestamp(8)

    const unsubTick = eventBus.on('price_tick', (event) => {
      const tick = event.data as { price: number; timestamp: number };
      const buf = Buffer.allocUnsafe(tickBufSize);
      buf[0] = 0x01; // message type: price tick
      buf[1] = instrBuf.length;
      instrBuf.copy(buf, 2);
      buf.writeDoubleBE(tick.price, headerSize);
      buf.writeDoubleBE(tick.timestamp, headerSize + 8);
      wsManager.broadcastRawToInstrument(instrumentId, buf);
    });
    unsubscribeHandlers.push(unsubTick);

    // 🔥 candle:update НЕ отправляется — фронтенд его не обрабатывает.
    // Живая свеча обновляется через price:update на стороне клиента.
    // Это убирает ~50% мусорного WS-трафика (candle:update шёл на каждый тик).

    const unsubCandleClose = eventBus.on('candle_closed', (event) => {
      const candle = event.data as {
        open: number;
        high: number;
        low: number;
        close: number;
        timestamp: number;
        timeframe: string;
      };
      // 🔥 FLOW WS-TF: Шлём candle:close только клиентам с matching таймфреймом
      wsManager.broadcastCandleToInstrument(instrumentId, candle.timeframe, {
        instrument: instrumentId,
        type: 'candle:close',
        data: {
          timeframe: candle.timeframe,
          candle: {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            timestamp: candle.timestamp,
            timeframe: candle.timeframe,
          },
        },
      });
    });
    unsubscribeHandlers.push(unsubCandleClose);
  }

  // Server time (no instrument)
  const serverTimeInterval = setInterval(() => {
    wsManager.broadcast({
      type: 'server:time',
      data: { timestamp: Date.now() },
    });
  }, 1000);
  (wsManager as { _serverTimeInterval?: NodeJS.Timeout })._serverTimeInterval =
    serverTimeInterval;

  logger.info(`✅ WebSocket events bootstrapped (${instrumentIds.length} instruments)`);
}

export function emitTradeOpen(trade: TradeDTO, userId: string): void {
  const wsManager = getWebSocketManager();
  wsManager.sendToUser(userId, {
    type: 'trade:open',
    data: trade,
  });
}

export function emitTradeClose(
  trade: TradeDTO,
  userId: string,
  result: 'WIN' | 'LOSS' | 'TIE',
): void {
  const wsManager = getWebSocketManager();
  wsManager.sendToUser(userId, {
    type: 'trade:close',
    data: { ...trade, result },
  });
}

/**
 * 🔥 FLOW A-ACCOUNT: Emit account snapshot to user
 */
export function emitAccountSnapshot(
  userId: string,
  snapshot: { accountId: string; type: 'REAL' | 'DEMO'; balance: number; currency: 'USD' | 'RUB' | 'UAH'; updatedAt: number },
): void {
  const wsManager = getWebSocketManager();
  wsManager.sendToUser(userId, {
    type: 'account.snapshot',
    payload: snapshot,
  });
}

export async function shutdownWebSocketEvents(): Promise<void> {
  logger.info('🛑 Shutting down WebSocket events...');

  unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
  unsubscribeHandlers = [];

  const wsManager = getWebSocketManager();
  wsManager.stopHeartbeat();
  const m = wsManager as { _serverTimeInterval?: NodeJS.Timeout };
  if (m._serverTimeInterval) {
    clearInterval(m._serverTimeInterval);
    m._serverTimeInterval = undefined;
  }

  logger.info('✅ WebSocket events shut down');
}
