/**
 * ohlc.types.ts - типы для OHLC панели
 * 
 * FLOW G8: OHLC panel types
 */

export type OhlcData = {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
  isLive: boolean;
};
