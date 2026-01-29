/**
 * sma.ts - Simple Moving Average
 * 
 * FLOW G12: SMA calculation
 * 
 * Чистая математика, без side-effects
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

/**
 * Вычисляет Simple Moving Average
 * 
 * @param candles - массив закрытых свечей
 * @param period - период (например, 20, 50)
 * @returns массив точек индикатора { time, value }
 */
export function calculateSMA(
  candles: Candle[],
  period: number
): IndicatorPoint[] {
  if (candles.length < period) {
    return [];
  }

  const points: IndicatorPoint[] = [];

  // Вычисляем SMA для каждой позиции
  for (let i = period - 1; i < candles.length; i++) {
    // Суммируем close за последние period свечей
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }

    const sma = sum / period;
    const candle = candles[i];

    points.push({
      time: candle.endTime, // Используем endTime свечи
      value: sma,
    });
  }

  return points;
}
