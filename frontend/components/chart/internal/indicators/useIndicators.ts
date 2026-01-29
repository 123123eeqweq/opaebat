/**
 * useIndicators - оркестрация индикаторов
 * 
 * FLOW G12: Indicators orchestration
 * 
 * Ответственность:
 * - Вычисление индикаторов на основе закрытых свечей
 * - Кеширование результатов
 * - Предоставление серий для рендера
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - считать индикаторы в RAF
 * - использовать live-свечу
 * - мутировать candles
 * - useState
 * - websocket
 */

import { useRef, useEffect } from 'react';
import type { Candle } from '../chart.types';
import type { IndicatorSeries, IndicatorConfig } from './indicator.types';
import { getActiveIndicators } from './indicatorRegistry';
import { calculateSMA } from './calculations/sma';
import { calculateEMA } from './calculations/ema';
import { calculateBollingerBands } from './calculations/bollinger';
import { calculateRSI } from './calculations/rsi';
import { calculateStochastic } from './calculations/stochastic';
import { calculateMomentum } from './calculations/momentum';

interface UseIndicatorsParams {
  getCandles: () => Candle[];
  indicatorConfigs: IndicatorConfig[]; // Конфигурация индикаторов с enabled/disabled
}

interface UseIndicatorsReturn {
  getIndicatorSeries: () => IndicatorSeries[];
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

export function useIndicators({
  getCandles,
  indicatorConfigs,
}: UseIndicatorsParams): UseIndicatorsReturn {
  // Кеш результатов через useRef
  const seriesCacheRef = useRef<IndicatorSeries[]>([]);
  const lastCandlesLengthRef = useRef<number>(0);
  const configsRef = useRef<IndicatorConfig[]>(indicatorConfigs);

  // Обновляем configs ref
  useEffect(() => {
    configsRef.current = indicatorConfigs;
  }, [indicatorConfigs]);

  /**
   * Пересчитать все индикаторы
   */
  const recalculateIndicators = () => {
    const candles = getCandles();
    
    // Берём ТОЛЬКО закрытые свечи
    const closedCandles = candles.filter(c => c.isClosed);

    // Если данных недостаточно, очищаем кеш
    if (closedCandles.length === 0) {
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
      const result = calculateIndicator(closedCandles, config);
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
    lastCandlesLengthRef.current = closedCandles.length;
  };

  /**
   * Получить серии индикаторов
   */
  const getIndicatorSeries = (): IndicatorSeries[] => {
    const candles = getCandles();
    const closedCandles = candles.filter(c => c.isClosed);

    // Пересчитываем, если количество свечей изменилось или конфигурация
    if (closedCandles.length !== lastCandlesLengthRef.current) {
      recalculateIndicators();
    }

    return seriesCacheRef.current;
  };

  // Пересчитываем при изменении количества свечей или конфигурации
  useEffect(() => {
    recalculateIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCandles, indicatorConfigs]);

  return {
    getIndicatorSeries,
  };
}
