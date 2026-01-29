/**
 * useCandleMode - оркестрация режимов отображения свечей
 * 
 * FLOW G10: Candle modes orchestration
 * 
 * Ответственность:
 * - Управление режимом отображения
 * - Трансформация свечей для рендера
 * - Предоставление API для переключения режимов
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - менять useChartData
 * - сохранять HA свечи
 * - мутировать source candles
 * - менять history / ws
 * - useState
 */

import { useRef } from 'react';
import type { Candle } from '../chart.types';
import type { CandleMode } from './candleMode.types';
import { transformToHeikinAshi, transformLiveCandleToHeikinAshi } from './heikinAshi';
import { transformToBars } from './barTransform';

interface UseCandleModeParams {
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
}

interface UseCandleModeReturn {
  getRenderCandles: () => Candle[];
  getRenderLiveCandle: () => Candle | null;
  setMode: (mode: CandleMode) => void;
  getMode: () => CandleMode;
}

export function useCandleMode({
  getCandles,
  getLiveCandle,
}: UseCandleModeParams): UseCandleModeReturn {
  // Хранение режима через useRef (не useState!)
  const modeRef = useRef<CandleMode>('classic');

  /**
   * Получить текущий режим
   */
  const getMode = (): CandleMode => {
    return modeRef.current;
  };

  /**
   * Установить режим
   */
  const setMode = (mode: CandleMode): void => {
    modeRef.current = mode;
  };

  /**
   * Получить свечи для рендера (с учётом режима)
   */
  const getRenderCandles = (): Candle[] => {
    const candles = getCandles();
    const mode = modeRef.current;

    switch (mode) {
      case 'classic':
        // Возвращаем как есть
        return candles;

      case 'heikin_ashi':
        // Трансформируем в Heikin Ashi
        return transformToHeikinAshi(candles);

      case 'bars':
        // Для bars данные не меняются, только способ отрисовки
        return transformToBars(candles);

      default:
        return candles;
    }
  };

  /**
   * Получить live-свечу для рендера (с учётом режима)
   */
  const getRenderLiveCandle = (): Candle | null => {
    const liveCandle = getLiveCandle();
    if (!liveCandle) {
      return null;
    }

    const mode = modeRef.current;

    switch (mode) {
      case 'classic':
        // Возвращаем как есть
        return liveCandle;

      case 'heikin_ashi': {
        // Трансформируем live-свечу в Heikin Ashi
        // Нужна последняя трансформированная закрытая свеча для вычисления HA_open
        const candles = getCandles();
        
        if (candles.length === 0) {
          // Если нет закрытых свечей, используем формулу для первой свечи
          return transformLiveCandleToHeikinAshi(liveCandle, null);
        }
        
        // Трансформируем все закрытые свечи в HA
        const haCandles = transformToHeikinAshi(candles);
        // Берём последнюю трансформированную свечу
        const prevHaCandle = haCandles[haCandles.length - 1];

        return transformLiveCandleToHeikinAshi(liveCandle, prevHaCandle);
      }

      case 'bars':
        // Для bars данные не меняются, только способ отрисовки
        return liveCandle;

      default:
        return liveCandle;
    }
  };

  return {
    getRenderCandles,
    getRenderLiveCandle,
    setMode,
    getMode,
  };
}
