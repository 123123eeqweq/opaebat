/**
 * Price engine types
 */

export interface PriceTick {
  price: number;
  timestamp: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number; // Start timestamp of the candle
  timeframe: string; // '5s', '10s', '15s', '30s', '1m'
}

export type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m';

export interface PriceConfig {
  asset: string;
  initialPrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number; // 0-1, controls price movement
  tickInterval: number; // milliseconds (400-600ms)
}

export interface CandleConfig {
  baseTimeframe: Timeframe; // '5s'
  aggregationTimeframes: Timeframe[]; // ['10s', '15s', '30s', '1m']
}

export type PriceEventType = 'price_tick' | 'candle_opened' | 'candle_updated' | 'candle_closed';

export interface PriceEvent {
  type: PriceEventType;
  data: PriceTick | Candle;
  timestamp: number;
}
