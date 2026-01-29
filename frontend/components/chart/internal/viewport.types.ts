/**
 * viewport.types.ts - типы для viewport системы графика
 * 
 * FLOW G3: Viewport types
 */

/**
 * Viewport - видимая область графика
 */
export type Viewport = {
  timeStart: number;
  timeEnd: number;
  priceMin: number;
  priceMax: number;
  yMode: 'auto' | 'manual'; // 🔥 FLOW Y1: Y-scale mode
};

/**
 * ViewportConfig - конфигурация viewport
 */
export type ViewportConfig = {
  visibleCandles: number; // например 60
  yPaddingRatio: number; // например 0.1 (10%)
  rightPaddingRatio: number; // например 0.25 (25%) - для follow mode
};
