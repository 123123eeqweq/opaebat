/**
 * barTransform.ts - трансформация для режима bars (OHLC bars)
 * 
 * FLOW G10: Bars transformation
 * 
 * Примечание: для bars данные не меняются,
 * только способ отрисовки (см. renderCandles.ts)
 */

import type { Candle } from '../chart.types';

/**
 * Для режима bars данные не трансформируются
 * Трансформация происходит только в рендере
 * 
 * Эта функция существует для консистентности API,
 * но просто возвращает свечи как есть
 */
export function transformToBars(candles: Candle[]): Candle[] {
  // Данные не меняются, только способ отрисовки
  return candles;
}
