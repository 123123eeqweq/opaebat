/**
 * ema.ts - Exponential Moving Average
 * 
 * FLOW G12: EMA calculation
 * 
 * Чистая математика, без side-effects
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

/**
 * Вычисляет Exponential Moving Average
 * 
 * Формула:
 * EMA[today] = (Price[today] * Multiplier) + (EMA[yesterday] * (1 - Multiplier))
 * Multiplier = 2 / (Period + 1)
 * 
 * Первая EMA = SMA за period свечей
 * 
 * @param candles - массив закрытых свечей
 * @param period - период (например, 20, 50)
 * @returns массив точек индикатора { time, value }
 */
export function calculateEMA(
  candles: Candle[],
  period: number
): IndicatorPoint[] {
  if (candles.length < period) {
    return [];
  }

  const points: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Первая EMA = SMA за period свечей
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;

  // Добавляем первую точку
  points.push({
    time: candles[period - 1].endTime,
    value: ema,
  });

  // Вычисляем EMA для остальных свечей
  for (let i = period; i < candles.length; i++) {
    const candle = candles[i];
    
    // EMA[today] = (Price[today] * Multiplier) + (EMA[yesterday] * (1 - Multiplier))
    ema = (candle.close * multiplier) + (ema * (1 - multiplier));

    points.push({
      time: candle.endTime,
      value: ema,
    });
  }

  return points;
}
