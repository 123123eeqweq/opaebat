/**
 * momentum.ts - Momentum Oscillator
 *
 * FLOW G12: Momentum calculation
 *
 * Momentum = Close - Close[n]
 * Отрицательные и положительные значения, нулевая линия по центру.
 * Гистограмма: зелёные столбцы вверх (положительный моментум), красные вниз (отрицательный).
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

/**
 * Вычисляет Momentum: разница текущего Close и Close period периодов назад.
 *
 * @param candles - массив закрытых свечей
 * @param period - период (обычно 10, 12, 14)
 * @returns массив точек { time, value }, value может быть положительным и отрицательным
 */
export function calculateMomentum(
  candles: Candle[],
  period: number
): IndicatorPoint[] {
  if (candles.length <= period) {
    return [];
  }

  const points: IndicatorPoint[] = [];

  for (let i = period; i < candles.length; i++) {
    const value = candles[i].close - candles[i - period].close;
    points.push({
      time: candles[i].endTime,
      value,
    });
  }

  return points;
}
