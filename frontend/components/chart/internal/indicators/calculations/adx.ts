/**
 * adx.ts - ADX (Average Directional Index) + +DI / -DI
 *
 * FLOW G12: ADX calculation
 *
 * Wilder's method:
 * +DM = high - prevHigh (if > 0 and > (prevLow - low)), else 0
 * -DM = prevLow - low (if > 0 and > (high - prevHigh)), else 0
 * TR = True Range
 * Wilder smooth: first = sum(first period) / period, then smooth = (prev * (period-1) + current) / period
 * +DI = 100 * smooth(+DM) / smooth(TR), -DI = 100 * smooth(-DM) / smooth(TR)
 * DX = 100 * |+DI - -DI| / (+DI + -DI)
 * ADX = Wilder smooth of DX
 *
 * Все значения в диапазоне 0..100; рисуется в отдельной зоне (как RSI/Stochastic).
 */

import type { Candle } from '../../chart.types';
import type { IndicatorPoint } from '../indicator.types';

function trueRanges(candles: Candle[]): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) tr.push(c.high - c.low);
    else {
      const prev = candles[i - 1];
      tr.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
    }
  }
  return tr;
}

function directionalMovement(candles: Candle[]): { plusDM: number[]; minusDM: number[] } {
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high - candles[i - 1].high;
    const l = candles[i - 1].low - candles[i].low;
    if (h > l && h > 0) {
      plusDM.push(h);
      minusDM.push(0);
    } else if (l > h && l > 0) {
      plusDM.push(0);
      minusDM.push(l);
    } else {
      plusDM.push(0);
      minusDM.push(0);
    }
  }
  return { plusDM, minusDM };
}

/** Wilder's smoothing: first = SMA(period), then (prev * (period-1) + current) / period */
function wilderSmooth(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out.push(sum / period);
  for (let i = period; i < values.length; i++) {
    out.push((out[out.length - 1] * (period - 1) + values[i]) / period);
  }
  return out;
}

export interface ADXResult {
  adx: IndicatorPoint[];
  plusDI: IndicatorPoint[];
  minusDI: IndicatorPoint[];
}

/**
 * Вычисляет ADX, +DI, -DI (период по умолчанию 14).
 */
export function calculateADX(candles: Candle[], period: number = 14): ADXResult {
  const n = candles.length;
  if (n < period * 2) return { adx: [], plusDI: [], minusDI: [] };

  const tr = trueRanges(candles);
  const { plusDM, minusDM } = directionalMovement(candles);

  const smoothTR = wilderSmooth(tr, period);
  const smoothPlus = wilderSmooth(plusDM, period);
  const smoothMinus = wilderSmooth(minusDM, period);

  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];

  for (let i = 0; i < smoothTR.length; i++) {
    const trVal = smoothTR[i] < 1e-12 ? 1 : smoothTR[i];
    plusDI.push(100 * smoothPlus[i] / trVal);
    minusDI.push(100 * smoothMinus[i] / trVal);
    const sum = plusDI[i] + minusDI[i];
    if (sum < 1e-12) dx.push(0);
    else dx.push(100 * Math.abs(plusDI[i] - minusDI[i]) / sum);
  }

  const adxSmooth = wilderSmooth(dx, period);

  const adxPoints: IndicatorPoint[] = [];
  const plusDIPoints: IndicatorPoint[] = [];
  const minusDIPoints: IndicatorPoint[] = [];

  for (let i = 0; i < adxSmooth.length; i++) {
    const candleIdx = 2 * period - 2 + i;
    if (candleIdx >= n) break;
    const t = candles[candleIdx].endTime;
    const diIdx = period - 1 + i;
    if (diIdx >= plusDI.length) break;
    adxPoints.push({ time: t, value: adxSmooth[i] });
    plusDIPoints.push({ time: t, value: plusDI[diIdx] });
    minusDIPoints.push({ time: t, value: minusDI[diIdx] });
  }

  return {
    adx: adxPoints,
    plusDI: plusDIPoints,
    minusDI: minusDIPoints,
  };
}
