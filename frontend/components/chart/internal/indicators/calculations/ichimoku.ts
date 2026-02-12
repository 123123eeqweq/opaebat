/**
 * ichimoku.ts - Ichimoku Kinko Hyo (Ichimoku Cloud)
 *
 * FLOW G12: Ichimoku calculation
 *
 * Tenkan-sen (Conversion) = (9-period high + 9-period low) / 2
 * Kijun-sen (Base) = (26-period high + 26-period low) / 2
 * Senkou Span A (Leading A) = (Tenkan + Kijun) / 2, shifted 26 periods ahead
 * Senkou Span B (Leading B) = (52-period high + 52-period low) / 2, shifted 26 ahead
 * Chikou Span (Lagging) = Close, shifted 26 periods behind
 *
 * Стандартные периоды: 9, 26, 52, смещение 26.
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

function midpoint(candles: Candle[], index: number, period: number): number {
  let high = candles[index].high;
  let low = candles[index].low;
  for (let j = index - period + 1; j < index; j++) {
    if (j >= 0) {
      high = Math.max(high, candles[j].high);
      low = Math.min(low, candles[j].low);
    }
  }
  return (high + low) / 2;
}

export interface IchimokuResult {
  tenkan: IndicatorPoint[];
  kijun: IndicatorPoint[];
  senkouA: IndicatorPoint[];
  senkouB: IndicatorPoint[];
  chikou: IndicatorPoint[];
}

/**
 * Вычисляет индикатор Ишимоку.
 *
 * @param candles - массив закрытых свечей
 * @param conversionPeriod - период Tenkan (по умолчанию 9)
 * @param basePeriod - период Kijun (по умолчанию 26)
 * @param spanBPeriod - период Senkou Span B (по умолчанию 52)
 * @param displacement - смещение для Senkou A/B и Chikou (по умолчанию 26)
 */
export function calculateIchimoku(
  candles: Candle[],
  conversionPeriod: number,
  basePeriod: number,
  spanBPeriod: number,
  displacement: number
): IchimokuResult {
  const n = candles.length;
  if (n < basePeriod) {
    return { tenkan: [], kijun: [], senkouA: [], senkouB: [], chikou: [] };
  }

  const tenkan: IndicatorPoint[] = [];
  const kijun: IndicatorPoint[] = [];

  for (let i = conversionPeriod - 1; i < n; i++) {
    tenkan.push({
      time: candles[i].endTime,
      value: midpoint(candles, i, conversionPeriod),
    });
  }
  for (let i = basePeriod - 1; i < n; i++) {
    kijun.push({
      time: candles[i].endTime,
      value: midpoint(candles, i, basePeriod),
    });
  }

  // Senkou A = (Tenkan + Kijun) / 2, сдвиг на displacement вперёд
  const senkouA: IndicatorPoint[] = [];
  const firstSenkouCandle = basePeriod - 1 + displacement;
  for (let i = firstSenkouCandle; i < n; i++) {
    const srcIdx = i - displacement;
    const tenkanVal = tenkan[srcIdx - (conversionPeriod - 1)]?.value;
    const kijunVal = kijun[srcIdx - (basePeriod - 1)]?.value;
    if (tenkanVal !== undefined && kijunVal !== undefined) {
      senkouA.push({
        time: candles[i].endTime,
        value: (tenkanVal + kijunVal) / 2,
      });
    }
  }

  // Senkou B = midpoint(52), сдвиг на displacement вперёд. Один к одному с Senkou A по времени.
  const senkouBFinal: IndicatorPoint[] = senkouA.map((p, idx) => {
    const i = firstSenkouCandle + idx;
    const srcIdx = i - displacement;
    const value =
      srcIdx >= spanBPeriod - 1
        ? midpoint(candles, srcIdx, spanBPeriod)
        : p.value;
    return { time: p.time, value };
  });

  // Chikou = Close, сдвиг на displacement назад (показываем close[i] в точке времени candles[i-displacement])
  const chikou: IndicatorPoint[] = [];
  for (let i = displacement; i < n; i++) {
    chikou.push({
      time: candles[i - displacement].endTime,
      value: candles[i].close,
    });
  }

  return {
    tenkan,
    kijun,
    senkouA,
    senkouB: senkouBFinal,
    chikou,
  };
}
