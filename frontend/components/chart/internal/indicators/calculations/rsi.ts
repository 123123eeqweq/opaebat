/**
 * rsi.ts - Relative Strength Index
 * 
 * FLOW G12: RSI calculation
 * 
 * Чистая математика, без side-effects
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

/**
 * Вычисляет Relative Strength Index
 * 
 * Формула:
 * RS = Average Gain / Average Loss
 * RSI = 100 - (100 / (1 + RS))
 * 
 * Первая Average Gain/Loss = простая средняя за period периодов
 * Последующие = экспоненциальная средняя (Wilder's smoothing)
 * 
 * @param candles - массив закрытых свечей
 * @param period - период (обычно 14)
 * @returns массив точек индикатора { time, value }
 */
export function calculateRSI(
  candles: Candle[],
  period: number
): IndicatorPoint[] {
  if (candles.length < period + 1) {
    return [];
  }

  const points: IndicatorPoint[] = [];

  // Вычисляем изменения цены
  const changes: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close);
  }

  // Первая Average Gain и Average Loss (простая средняя)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain = avgGain / period;
  avgLoss = avgLoss / period;

  // Если avgLoss = 0, RSI = 100
  if (avgLoss === 0) {
    points.push({
      time: candles[period].endTime,
      value: 100,
    });
  } else {
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    points.push({
      time: candles[period].endTime,
      value: rsi,
    });
  }

  // Вычисляем RSI для остальных свечей (Wilder's smoothing)
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    let gain = 0;
    let loss = 0;

    if (change > 0) {
      gain = change;
    } else {
      loss = Math.abs(change);
    }

    // Wilder's smoothing: EMA-like calculation
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      points.push({
        time: candles[i + 1].endTime,
        value: 100,
      });
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      points.push({
        time: candles[i + 1].endTime,
        value: rsi,
      });
    }
  }

  return points;
}
