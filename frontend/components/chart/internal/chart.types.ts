/**
 * chart.types.ts - типы данных для графика
 * 
 * FLOW G2: Data Layer types
 */

/**
 * Candle - свеча графика
 */
export type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
  isClosed: boolean;
  volume?: number; // Опционально для line chart индикаторов
};

/**
 * SnapshotCandle - формат свечи из snapshot (backend)
 */
export type SnapshotCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
};
