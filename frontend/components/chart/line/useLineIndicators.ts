/**
 * useLineIndicators - вычисление индикаторов для линейного графика
 * 
 * Агрегирует тики в свечи для вычисления индикаторов
 */

import { useRef, useEffect, useCallback } from 'react';
import type { PricePoint } from './useLinePointStore';
import type { IndicatorSeries, IndicatorConfig } from '../internal/indicators/indicator.types';
import type { Candle } from '../internal/chart.types';
import { getActiveIndicators } from '../internal/indicators/indicatorRegistry';
import { calculateSMA } from '../internal/indicators/calculations/sma';
import { calculateEMA } from '../internal/indicators/calculations/ema';
import { calculateBollingerBands } from '../internal/indicators/calculations/bollinger';
import { calculateRSI } from '../internal/indicators/calculations/rsi';
import { calculateStochastic } from '../internal/indicators/calculations/stochastic';
import { calculateMomentum } from '../internal/indicators/calculations/momentum';

interface UseLineIndicatorsParams {
  getTicks: () => PricePoint[];
  indicatorConfigs: IndicatorConfig[];
  /** Timeframe в миллисекундах для агрегации точек в свечи */
  timeframeMs: number;
}

/**
 * Агрегирует тики в свечи для вычисления индикаторов
 */
function aggregateTicksToCandles(ticks: PricePoint[], timeframeMs: number): Candle[] {
  if (ticks.length === 0) return [];

  // Сортируем тики по времени
  const sortedTicks = [...ticks].sort((a, b) => a.time - b.time);

  const candles: Candle[] = [];
  let currentCandle: {
    startTime: number;
    endTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null = null;

  for (const tick of sortedTicks) {
    const slotStart = Math.floor(tick.time / timeframeMs) * timeframeMs;
    const slotEnd = slotStart + timeframeMs;

    if (!currentCandle || currentCandle.startTime !== slotStart) {
      // Сохраняем предыдущую свечу
      if (currentCandle) {
        candles.push({
          startTime: currentCandle.startTime,
          endTime: currentCandle.endTime,
          open: currentCandle.open,
          high: currentCandle.high,
          low: currentCandle.low,
          close: currentCandle.close,
          volume: currentCandle.volume,
          isClosed: true, // Все свечи закрыты для индикаторов
        });
      }

      // Начинаем новую свечу
      currentCandle = {
        startTime: slotStart,
        endTime: slotEnd,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: 1,
      };
    } else {
      // Обновляем текущую свечу
      currentCandle.high = Math.max(currentCandle.high, tick.price);
      currentCandle.low = Math.min(currentCandle.low, tick.price);
      currentCandle.close = tick.price;
      currentCandle.volume += 1;
    }
  }

  // Добавляем последнюю свечу
  if (currentCandle) {
    candles.push({
      startTime: currentCandle.startTime,
      endTime: currentCandle.endTime,
      open: currentCandle.open,
      high: currentCandle.high,
      low: currentCandle.low,
      close: currentCandle.close,
      volume: currentCandle.volume,
      isClosed: true,
    });
  }

  return candles;
}

/**
 * Вычисляет индикатор на основе типа
 */
type IndicatorResult =
  | Array<{ time: number; value: number }>
  | { k: Array<{ time: number; value: number }>; d: Array<{ time: number; value: number }> }
  | { upper: Array<{ time: number; value: number }>; middle: Array<{ time: number; value: number }>; lower: Array<{ time: number; value: number }> };

function calculateIndicator(
  candles: Candle[],
  config: IndicatorConfig
): IndicatorResult {
  const { type, period, periodD, stdDevMult } = config;
  switch (type) {
    case 'SMA':
      return calculateSMA(candles, period);
    case 'EMA':
      return calculateEMA(candles, period);
    case 'BollingerBands':
      return calculateBollingerBands(candles, period, stdDevMult ?? 2);
    case 'RSI':
      return calculateRSI(candles, period);
    case 'Stochastic':
      return calculateStochastic(candles, period, periodD ?? 3);
    case 'Momentum':
      return calculateMomentum(candles, period);
    default:
      return [];
  }
}

export function useLineIndicators({
  getTicks,
  indicatorConfigs,
  timeframeMs,
}: UseLineIndicatorsParams): { getIndicatorSeries: () => IndicatorSeries[] } {
  const seriesCacheRef = useRef<IndicatorSeries[]>([]);
  const lastTicksLengthRef = useRef<number>(0);
  const configsRef = useRef<IndicatorConfig[]>(indicatorConfigs);

  useEffect(() => {
    configsRef.current = indicatorConfigs;
  }, [indicatorConfigs]);

  const recalculateIndicators = useCallback(() => {
    const ticks = getTicks();
    
    if (ticks.length === 0) {
      seriesCacheRef.current = [];
      return;
    }

    // Агрегируем тики в свечи
    const candles = aggregateTicksToCandles(ticks, timeframeMs);

    if (candles.length === 0) {
      seriesCacheRef.current = [];
      return;
    }

    // Получаем только включенные индикаторы
    const activeConfigs = getActiveIndicators(configsRef.current);
    
    if (activeConfigs.length === 0) {
      seriesCacheRef.current = [];
      return;
    }

    const series: IndicatorSeries[] = [];

    for (const config of activeConfigs) {
      const result = calculateIndicator(candles, config);
      if (config.type === 'Stochastic' && typeof result === 'object' && 'k' in result && 'd' in result) {
        series.push({ id: config.id + '_k', type: 'Stochastic', points: result.k });
        series.push({ id: config.id + '_d', type: 'Stochastic', points: result.d });
      } else if (
        config.type === 'BollingerBands' &&
        typeof result === 'object' &&
        'upper' in result &&
        'middle' in result &&
        'lower' in result
      ) {
        series.push({ id: config.id + '_upper', type: 'BollingerBands', points: result.upper });
        series.push({ id: config.id + '_middle', type: 'BollingerBands', points: result.middle });
        series.push({ id: config.id + '_lower', type: 'BollingerBands', points: result.lower });
      } else if (Array.isArray(result)) {
        series.push({
          id: config.id,
          type: config.type,
          points: result,
        });
      }
    }

    seriesCacheRef.current = series;
    lastTicksLengthRef.current = ticks.length;
  }, [getTicks, timeframeMs]);

  const getIndicatorSeries = useCallback((): IndicatorSeries[] => {
    const ticks = getTicks();

    // Пересчитываем, если количество тиков изменилось
    if (ticks.length !== lastTicksLengthRef.current) {
      recalculateIndicators();
    }

    return seriesCacheRef.current;
  }, [getTicks, recalculateIndicators]);

  useEffect(() => {
    recalculateIndicators();
  }, [recalculateIndicators]);

  return {
    getIndicatorSeries,
  };
}
