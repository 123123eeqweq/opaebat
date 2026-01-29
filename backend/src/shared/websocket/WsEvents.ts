/**
 * WebSocket event types
 */

import type { PriceTick } from '../../prices/PriceTypes.js';
import type { Candle } from '../../prices/PriceTypes.js';
import type { TradeDTO } from '../../domain/trades/TradeTypes.js';

/** FLOW P5: price/candle events include instrument (BTCUSD, EURUSD, …) */
export type WsEvent =
  | { instrument: string; type: 'price:update'; data: { asset: string; price: number; timestamp: number } }
  | { instrument: string; type: 'candle:update'; data: { timeframe: string; candle: Candle } }
  | { instrument: string; type: 'candle:close'; data: { timeframe: string; candle: Candle } }
  | { type: 'trade:open'; data: TradeDTO }
  | { type: 'trade:close'; data: TradeDTO & { result: 'WIN' | 'LOSS' } }
  | { type: 'trade:countdown'; data: { tradeId: string; secondsLeft: number } }
  | { type: 'server:time'; data: { timestamp: number } };

export interface WsClientMessage {
  type: 'ping' | 'subscribe' | 'unsubscribe';
  /**
   * Для subscribe: идентификатор инструмента (EURUSD, BTCUSD, …)
   */
  instrument?: string;
  data?: unknown;
}
