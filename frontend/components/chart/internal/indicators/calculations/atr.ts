/**
 * atr.ts - ATR (Average True Range)
 *
 * FLOW G12: ATR calculation
 *
 * True Range = max(H-L, |H-prevClose|, |L-prevClose|)
 * ATR = EMA(True Range, period)
 *
 * Показывает волатильность; рисуется в отдельной зоне под графиком.
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

function trueRanges(candles: Candle[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      tr.push(c.high - c.low);
    } else {
      const prevClose = candles[i - 1].close;
      const hl = c.high - c.low;
      const hc = Math.abs(c.high - prevClose);
      const lc = Math.abs(c.low - prevClose);
      tr.push(Math.max(hl, hc, lc));
    }
  }
  return tr;
}

function emaOfSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let ema = sum / period;
  result.push(ema);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result.push(ema);
  }
  return result;
}

/**
 * Вычисляет ATR.
 *
 * @param candles - массив закрытых свечей
 * @param period - период сглаживания (обычно 14)
 */
export function calculateATR(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period) return [];

  const tr = trueRanges(candles);
  const atrValues = emaOfSeries(tr, period);

  const points: IndicatorPoint[] = [];
  for (let i = 0; i < atrValues.length; i++) {
    points.push({
      time: candles[period - 1 + i].endTime,
      value: atrValues[i],
    });
  }
  return points;
}
