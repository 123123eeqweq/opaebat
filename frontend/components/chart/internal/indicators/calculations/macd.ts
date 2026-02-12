/**
 * macd.ts - MACD (Moving Average Convergence Divergence)
 *
 * FLOW G12: MACD calculation
 *
 * MACD Line = EMA(close, fast) - EMA(close, slow)
 * Signal Line = EMA(MACD Line, signalPeriod)
 * Histogram = MACD Line - Signal Line
 *
 * Стандартные периоды: fast 12, slow 26, signal 9.
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const out: number[] = [];
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let emaVal = sum / period;
  out.push(emaVal);
  for (let i = period; i < values.length; i++) {
    emaVal = values[i] * multiplier + emaVal * (1 - multiplier);
    out.push(emaVal);
  }
  return out;
}

export interface MACDResult {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
}

/**
 * Вычисляет MACD: линия MACD, сигнальная линия и гистограмма.
 *
 * @param candles - массив закрытых свечей
 * @param fastPeriod - период быстрой EMA (по умолчанию 12)
 * @param slowPeriod - период медленной EMA (по умолчанию 26)
 * @param signalPeriod - период EMA для сигнальной линии (по умолчанию 9)
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDResult {
  if (candles.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const closes = candles.map((c) => c.close);
  const fastEmaArr = ema(closes, fastPeriod);
  const slowEmaArr = ema(closes, slowPeriod);

  // MACD = fast EMA - slow EMA; выравниваем по длине slow (slowEmaArr короче, т.к. начинается с индекса slowPeriod-1)
  // fastEmaArr: длина = closes.length - fastPeriod + 1, индексы 0.. соответствуют candle индексам fastPeriod-1..
  // slowEmaArr: длина = closes.length - slowPeriod + 1, индексы 0.. соответствуют candle индексам slowPeriod-1..
  const macdValues: number[] = [];
  const macdTimes: number[] = [];
  const slowStart = slowPeriod - 1;
  for (let i = 0; i < slowEmaArr.length; i++) {
    const candleIndex = slowStart + i;
    const fastIndex = candleIndex - (fastPeriod - 1);
    if (fastIndex >= 0 && fastIndex < fastEmaArr.length) {
      macdValues.push(fastEmaArr[fastIndex] - slowEmaArr[i]);
      macdTimes.push(candles[candleIndex].endTime);
    }
  }

  if (macdValues.length < signalPeriod) {
    return {
      macd: macdTimes.map((t, i) => ({ time: t, value: macdValues[i] })),
      signal: [],
      histogram: [],
    };
  }

  const signalEmaArr = ema(macdValues, signalPeriod);
  const start = signalPeriod - 1;
  const macd: IndicatorPoint[] = [];
  const signal: IndicatorPoint[] = [];
  const histogram: IndicatorPoint[] = [];

  for (let i = start; i < macdValues.length; i++) {
    const t = macdTimes[i];
    const macdVal = macdValues[i];
    const signalVal = signalEmaArr[i - start];
    macd.push({ time: t, value: macdVal });
    signal.push({ time: t, value: signalVal });
    histogram.push({ time: t, value: macdVal - signalVal });
  }

  return { macd, signal, histogram };
}
