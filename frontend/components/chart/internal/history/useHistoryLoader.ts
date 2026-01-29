/**
 * useHistoryLoader - ядро FLOW G6
 * 
 * Ответственность:
 * - Загрузка истории свечей при pan влево
 * - Защита от дубликатов
 * - Управление состоянием загрузки
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - render
 * - interactions
 * - viewport-логика
 * - изменение live-свечи
 * - useState
 */

import { useRef } from 'react';
import { api } from '@/lib/api/api';
import type { SnapshotCandle } from '../chart.types';
import type { Viewport } from '../viewport.types';
import type { HistoryState } from './history.types';

interface UseHistoryLoaderParams {
  getCandles: () => Array<{ startTime: number; endTime: number }>; // Только для чтения startTime/endTime (normalized)
  getEarliestRealTime: () => number | null; // Реальный timestamp самой ранней свечи (БД) — для API ?to=
  prependCandles: (newCandles: SnapshotCandle[], timeframeMs: number) => void;
  timeframe: string; // например "5s"
  timeframeMs: number;
  asset: string;
}

interface UseHistoryLoaderReturn {
  maybeLoadMore: (viewport: Viewport) => void;
  getState: () => HistoryState;
  reset: () => void; // FLOW T1: сброс при смене timeframe (очистка loadedRanges, hasMore)
}

const PRELOAD_THRESHOLD_MS = 5000; // Загружаем за 5 секунд до границы (примерно 1 свеча для 5s timeframe)
const HISTORY_LIMIT = 200; // Количество свечей за запрос
const MAX_CANDLES = 3000; // Максимальное количество свечей в памяти

export function useHistoryLoader({
  getCandles,
  getEarliestRealTime,
  prependCandles,
  timeframe,
  timeframeMs,
  asset,
}: UseHistoryLoaderParams): UseHistoryLoaderReturn {
  const isLoadingRef = useRef<boolean>(false);
  const hasMoreRef = useRef<boolean>(true);
  const loadedRangesRef = useRef<Set<string>>(new Set());

  /** FLOW P: всегда брать текущий инструмент при запросе — колбэк pan может быть из старого рендера */
  const assetRef = useRef(asset);
  assetRef.current = asset;

  /**
   * Получить текущее состояние
   */
  const getState = (): HistoryState => {
    return {
      isLoading: isLoadingRef.current,
      hasMore: hasMoreRef.current,
    };
  };

  /**
   * Проверяет, нужно ли загрузить больше истории
   * Вызывается после pan
   */
  const maybeLoadMore = async (viewport: Viewport): Promise<void> => {
    // Если уже загружается или нет больше данных
    if (isLoadingRef.current || !hasMoreRef.current) {
      return;
    }

    const candles = getCandles();
    if (candles.length === 0) {
      return;
    }

    // Реальный timestamp самой ранней свечи (БД) — API использует реальные timestamps
    const toTime = getEarliestRealTime();
    if (toTime === null) {
      return;
    }

    // Находим самую раннюю свечу (normalized) для проверки «близко к левой границе»
    const earliestCandle = candles.reduce((earliest, candle) => {
      return candle.startTime < earliest.startTime ? candle : earliest;
    }, candles[0]);
    const earliestTime = earliestCandle.startTime;

    // Загружаем, если viewport.timeStart близко к earliestTime (normalized)
    const timeToEarliest = viewport.timeStart - earliestTime;
    if (timeToEarliest > PRELOAD_THRESHOLD_MS) {
      return; // Еще рано загружать
    }

    // FLOW P: instrument из ref — колбэк pan/zoom в useChartInteractions с deps [] даёт stale closure
    const currentInstrument = assetRef.current;
    const rangeKey = `${currentInstrument}-${toTime}-${HISTORY_LIMIT}`;
    if (loadedRangesRef.current.has(rangeKey)) {
      return;
    }

    isLoadingRef.current = true;
    loadedRangesRef.current.add(rangeKey);

    try {
      const url = `/api/quotes/candles?instrument=${encodeURIComponent(currentInstrument)}&timeframe=${encodeURIComponent(timeframe)}&to=${toTime}&limit=${HISTORY_LIMIT}`;

      // Формат ответа: { items: SnapshotCandle[] } или SnapshotCandle[]
      const response = await api<{ items: SnapshotCandle[] } | SnapshotCandle[]>(url);
      
      // Нормализуем формат ответа
      let items: SnapshotCandle[];
      if (Array.isArray(response)) {
        items = response;
      } else if (response && 'items' in response && Array.isArray(response.items)) {
        items = response.items;
      } else {
        items = [];
      }

      if (!items || items.length === 0) {
        // Нет больше данных
        hasMoreRef.current = false;
        isLoadingRef.current = false;
        return;
      }

      // Сортируем по времени (от старых к новым)
      const sortedCandles = [...items].sort(
        (a, b) => a.startTime - b.startTime
      );

      // Дедуп по startTime выполняется в useChartData.prependCandles (realStartTimesRef)
      // Prepend в data layer
      prependCandles(sortedCandles, timeframeMs);

      // Если пришло меньше limit → больше нет данных
      if (items.length < HISTORY_LIMIT) {
        hasMoreRef.current = false;
      }

      isLoadingRef.current = false;
    } catch (error) {
      console.error('Failed to load history:', error);
      isLoadingRef.current = false;
      // Не помечаем hasMore = false, чтобы можно было повторить
    }
  };

  const reset = (): void => {
    loadedRangesRef.current = new Set();
    hasMoreRef.current = true;
    isLoadingRef.current = false;
  };

  return {
    maybeLoadMore,
    getState,
    reset,
  };
}
