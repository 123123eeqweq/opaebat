/**
 * stochastic.ts - Stochastic Oscillator (%K, %D)
 *
 * FLOW G12: Stochastic calculation
 *
 * Fast Stochastic:
 * %K = 100 * (Close - Low_n) / (High_n - Low_n)
 * %D = SMA(%K, periodD)
 *
 * Оба в диапазоне 0–100. Уровни перекупленности/перепроданности: 80 и 20.
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

export type StochasticResult = {
  k: IndicatorPoint[];
  d: IndicatorPoint[];
};

/**
 * Вычисляет Stochastic Oscillator (Fast: сырой %K и SMA(%K) для %D)
 *
 * @param candles - массив закрытых свечей
 * @param periodK - период для %K (обычно 14)
 * @param periodD - период сглаживания для %D (обычно 3)
 * @returns { k, d } — массивы точек для %K и %D
 */
export function calculateStochastic(
  candles: Candle[],
  periodK: number,
  periodD: number = 3
): StochasticResult {
  if (candles.length < periodK) {
    return { k: [], d: [] };
  }

  const kPoints: IndicatorPoint[] = [];

  for (let i = periodK - 1; i < candles.length; i++) {
    let high = candles[i].high;
    let low = candles[i].low;
    for (let j = i - periodK + 1; j < i; j++) {
      if (candles[j].high > high) high = candles[j].high;
      if (candles[j].low < low) low = candles[j].low;
    }
    const close = candles[i].close;
    const range = high - low;
    const value = range === 0 ? 50 : (100 * (close - low)) / range;
    kPoints.push({
      time: candles[i].endTime,
      value,
    });
  }

  if (kPoints.length < periodD) {
    return { k: kPoints, d: [] };
  }

  const dPoints: IndicatorPoint[] = [];
  for (let i = periodD - 1; i < kPoints.length; i++) {
    let sum = 0;
    for (let j = i - periodD + 1; j <= i; j++) {
      sum += kPoints[j].value;
    }
    dPoints.push({
      time: kPoints[i].time,
      value: sum / periodD,
    });
  }

  return { k: kPoints, d: dPoints };
}
