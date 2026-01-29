/**
 * useChartData - ядро FLOW G2
 * 
 * Ответственность:
 * - Хранение свечей (candlesRef)
 * - Хранение live-свечи (liveCandleRef)
 * - Инициализация из snapshot
 * - Обновление live-свечи по цене
 * - Закрытие свечей
 * - Соблюдение инвариантов
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - canvas
 * - viewport
 * - render
 * - websocket
 * - pan / zoom
 * - useState
 * - side-effects вне хука
 */

import { useRef } from 'react';
import type { Candle, SnapshotCandle } from './chart.types';

interface UseChartDataParams {
  onDataChange?: () => void;
  timeframeMs?: number; // Для нормализации времени исторических свечей
}

interface UseChartDataReturn {
  initializeFromSnapshot: (
    candles: SnapshotCandle[],
    currentPrice: number,
    currentTime: number,
    timeframeMs: number
  ) => void;
  handlePriceUpdate: (price: number, timestamp: number) => void;
  handleCandleClose: (
    closedCandle: SnapshotCandle,
    nextCandleStartTime: number
  ) => void;
  prependCandles: (newCandles: SnapshotCandle[], timeframeMs: number) => void;
  reset: () => void; // 🔥 FLOW T1: сброс данных при смене timeframe
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  /** FLOW G6: реальный timestamp самой ранней свечи (для /api/quotes/candles ?to=) */
  getEarliestRealTime: () => number | null;
}

/**
 * Нормализует свечу, исправляя инварианты
 */
function normalizeCandle(candle: Candle): Candle {
  // Инвариант: high >= max(open, close)
  const maxOpenClose = Math.max(candle.open, candle.close);
  const high = Math.max(candle.high, maxOpenClose);

  // Инвариант: low <= min(open, close)
  const minOpenClose = Math.min(candle.open, candle.close);
  const low = Math.min(candle.low, minOpenClose);

  // Проверка на NaN / Infinity
  const safeValue = (value: number): number => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return value;
  };

  return {
    open: safeValue(candle.open),
    high: safeValue(high),
    low: safeValue(low),
    close: safeValue(candle.close),
    startTime: safeValue(candle.startTime),
    endTime: safeValue(candle.endTime),
    isClosed: candle.isClosed,
  };
}

/**
 * Создает новую live-свечу
 */
function createLiveCandle(
  open: number,
  startTime: number,
  currentPrice: number,
  currentTime: number
): Candle {
  return normalizeCandle({
    open,
    high: Math.max(open, currentPrice),
    low: Math.min(open, currentPrice),
    close: currentPrice,
    startTime,
    endTime: currentTime,
    isClosed: false,
  });
}

export function useChartData({ onDataChange, timeframeMs: defaultTimeframeMs = 5000 }: UseChartDataParams = {}): UseChartDataReturn {
  // Хранение данных через useRef (не useState!)
  const candlesRef = useRef<Candle[]>([]);
  const liveCandleRef = useRef<Candle | null>(null);
  /** FLOW G6: реальный timestamp самой ранней свечи (БД), для API pagination */
  const earliestRealTimeRef = useRef<number | null>(null);
  /** FLOW G6: реальные startTime уже загруженных свечей (дедуп при prepend) */
  const realStartTimesRef = useRef<Set<number>>(new Set());

  /**
   * Инициализация из snapshot
   */
  const initializeFromSnapshot = (
    snapshotCandles: SnapshotCandle[],
    currentPrice: number,
    currentTime: number,
    timeframeMs: number
  ): void => {
    if (snapshotCandles.length === 0) {
      // Если snapshot пустой → создать live-свечу из price/time
      liveCandleRef.current = createLiveCandle(
        currentPrice,
        currentTime,
        currentPrice,
        currentTime
      );
      candlesRef.current = [];
      earliestRealTimeRef.current = null;
      realStartTimesRef.current = new Set();
      return;
    }

    // Преобразуем SnapshotCandle → Candle
    // Нормализуем время: каждая свеча занимает фиксированный слот
    // Это устраняет дырки между историческими свечами
    const closedCandles: Candle[] = [];
    
    // Используем время последней свечи как якорь
    const lastSnapshotCandle = snapshotCandles[snapshotCandles.length - 1];
    const anchorTime = lastSnapshotCandle.endTime;
    
    // Вычисляем нормализованное время первой свечи
    // Отсчитываем назад от якоря
    const firstNormalizedTime = anchorTime - (snapshotCandles.length * timeframeMs);
    
    for (let i = 0; i < snapshotCandles.length; i++) {
      const snapshotCandle = snapshotCandles[i];
      const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
      const normalizedEndTime = normalizedStartTime + timeframeMs;
      
      const normalizedCandle = normalizeCandle({
        ...snapshotCandle,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        isClosed: true,
      });
      
      closedCandles.push(normalizedCandle);
    }

    // Проверяем инвариант: open[n] === close[n-1]
    for (let i = 1; i < closedCandles.length; i++) {
      const prev = closedCandles[i - 1];
      const curr = closedCandles[i];
      if (curr.open !== prev.close) {
        // Исправляем инвариант
        closedCandles[i] = normalizeCandle({
          ...curr,
          open: prev.close,
        });
      }
    }

    candlesRef.current = closedCandles;

    // FLOW G6: храним реальные timestamps для API и дедупа
    earliestRealTimeRef.current = snapshotCandles[0].startTime;
    realStartTimesRef.current = new Set(snapshotCandles.map((c) => c.startTime));

    // Создаем live-свечу на основе последней закрытой свечи
    if (closedCandles.length > 0) {
      const lastCandle = closedCandles[closedCandles.length - 1];
      liveCandleRef.current = createLiveCandle(
        lastCandle.close,
        lastCandle.endTime,
        currentPrice,
        currentTime
      );
    } else {
      // Если snapshot пустой → создать live-свечу из price/time
      liveCandleRef.current = createLiveCandle(
        currentPrice,
        currentTime,
        currentPrice,
        currentTime
      );
    }

    // НЕ вызываем onDataChange здесь - это только для обновлений, не для инициализации
    // Полный пересчет viewport будет вызван в useChart после инициализации
  };

  /**
   * Обработка обновления цены
   */
  const handlePriceUpdate = (price: number, timestamp: number): void => {
    // Если live-свечи нет → создать
    if (!liveCandleRef.current) {
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      const previousClose = lastCandle?.close ?? price;
      const previousEndTime = lastCandle?.endTime ?? timestamp;

      liveCandleRef.current = createLiveCandle(
        previousClose,
        previousEndTime,
        price,
        timestamp
      );
      onDataChange?.();
      return;
    }

    // Обновляем live-свечу
    const liveCandle = liveCandleRef.current;

    // Инвариант: live-свеча не должна быть закрыта
    if (liveCandle.isClosed) {
      console.warn('Attempted to update closed live candle');
      return;
    }

    // Обновляем: close, high, low, endTime
    liveCandleRef.current = normalizeCandle({
      ...liveCandle,
      high: Math.max(liveCandle.high, price),
      low: Math.min(liveCandle.low, price),
      close: price,
      endTime: timestamp,
    });

    // Уведомляем об изменении данных
    onDataChange?.();
  };

  /**
   * Обработка закрытия свечи
   */
  const handleCandleClose = (
    closedCandle: SnapshotCandle,
    nextCandleStartTime: number
  ): void => {
    const liveCandle = liveCandleRef.current;

    if (!liveCandle) {
      // Если нет live-свечи, создаем новую на основе closedCandle
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      const previousClose = lastCandle?.close ?? closedCandle.close;

      liveCandleRef.current = createLiveCandle(
        previousClose,
        nextCandleStartTime,
        closedCandle.close,
        nextCandleStartTime
      );
      return;
    }

    // 🔥 ВАЖНО: нормализуем время закрытой свечи
    // Используем startTime из live-свечи (который уже нормализован)
    // а не из closedCandle (который может быть не нормализован)
    const lastCandle = candlesRef.current[candlesRef.current.length - 1];
    
    // Используем нормализованное время из live-свечи
    // Если есть lastCandle, убеждаемся, что мы продолжаем нормализованную последовательность
    let normalizedStartTime = liveCandle.startTime;
    if (lastCandle) {
      // Инвариант: startTime новой закрытой свечи должен быть равен endTime предыдущей
      // Это гарантирует отсутствие дырок
      normalizedStartTime = lastCandle.endTime;
    }
    
    // Вычисляем нормализованный endTime: startTime + timeframeMs (фиксированная длительность свечи)
    // НЕ используем liveCandle.endTime - liveCandle.startTime, т.к. endTime не нормализован
    const normalizedEndTime = normalizedStartTime + defaultTimeframeMs;

    // Закрываем текущую live-свечу с нормализованным временем
    const closedLiveCandle: Candle = normalizeCandle({
      ...liveCandle,
      ...closedCandle,
      startTime: normalizedStartTime, // Используем нормализованное время
      endTime: normalizedEndTime,      // Используем нормализованное время
      isClosed: true,
    });

    // Проверяем инвариант: open === prev.close
    if (lastCandle && closedLiveCandle.open !== lastCandle.close) {
      closedLiveCandle.open = lastCandle.close;
      // Пересчитываем high/low после изменения open
      closedLiveCandle.high = Math.max(
        closedLiveCandle.high,
        Math.max(closedLiveCandle.open, closedLiveCandle.close)
      );
      closedLiveCandle.low = Math.min(
        closedLiveCandle.low,
        Math.min(closedLiveCandle.open, closedLiveCandle.close)
      );
    }

    // Пушим закрытую свечу в candlesRef
    candlesRef.current = [...candlesRef.current, normalizeCandle(closedLiveCandle)];

    // Создаем НОВУЮ live-свечу
    // open = close предыдущей (закрытой)
    // startTime = normalizedEndTime (продолжаем нормализованную последовательность)
    // endTime будет обновляться при price:update, но startTime остается нормализованным
    liveCandleRef.current = createLiveCandle(
      closedLiveCandle.close,
      normalizedEndTime, // Используем нормализованное endTime предыдущей свечи как startTime новой
      closedLiveCandle.close,
      normalizedEndTime // endTime = startTime (будет обновляться при price:update)
    );

    // Уведомляем об изменении данных
    onDataChange?.();
  };

  /**
   * Получить все закрытые свечи
   */
  const getCandles = (): Candle[] => {
    return [...candlesRef.current];
  };

  /**
   * Получить live-свечу
   */
  const getLiveCandle = (): Candle | null => {
    return liveCandleRef.current ? { ...liveCandleRef.current } : null;
  };

  /**
   * Добавляет свечи В НАЧАЛО массива (prepend)
   * Используется для загрузки истории
   * 
   * FLOW G6: History Loading
   */
  const prependCandles = (
    newCandles: SnapshotCandle[],
    timeframeMs: number
  ): void => {
    if (newCandles.length === 0) return;

    // FLOW G6: дедуп по реальным startTime (API vs normalized в чарте)
    const seen = realStartTimesRef.current;
    const uniqueNew = newCandles.filter((c) => {
      if (seen.has(c.startTime)) return false;
      seen.add(c.startTime);
      return true;
    });
    if (uniqueNew.length === 0) return;

    // Сортируем по времени (от старых к новым)
    uniqueNew.sort((a, b) => a.startTime - b.startTime);

    // Если нет существующих свечей, просто инициализируем
    if (candlesRef.current.length === 0) {
      // Используем initializeFromSnapshot логику
      const lastCandle = uniqueNew[uniqueNew.length - 1];
      const anchorTime = lastCandle.endTime;
      const firstNormalizedTime = anchorTime - (uniqueNew.length * timeframeMs);
      
      const normalizedCandles: Candle[] = [];
      for (let i = 0; i < uniqueNew.length; i++) {
        const snapshotCandle = uniqueNew[i];
        const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
        const normalizedEndTime = normalizedStartTime + timeframeMs;
        
        normalizedCandles.push(normalizeCandle({
          ...snapshotCandle,
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          isClosed: true,
        }));
      }
      
      candlesRef.current = normalizedCandles;
      earliestRealTimeRef.current = uniqueNew[0].startTime;
      onDataChange?.();
      return;
    }

    // Нормализуем новые свечи относительно существующих
    const normalizedNewCandles: Candle[] = [];
    
    // Используем время первой существующей свечи как якорь
    const firstExistingCandle = candlesRef.current[0];
    const anchorTime = firstExistingCandle.startTime;
    
    // Вычисляем нормализованное время первой новой свечи
    // Новые свечи должны идти ПЕРЕД существующими
    const firstNormalizedTime = anchorTime - (uniqueNew.length * timeframeMs);
    
    for (let i = 0; i < uniqueNew.length; i++) {
      const snapshotCandle = uniqueNew[i];
      const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
      const normalizedEndTime = normalizedStartTime + timeframeMs;
      
      const normalizedCandle = normalizeCandle({
        ...snapshotCandle,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        isClosed: true,
      });
      
      normalizedNewCandles.push(normalizedCandle);
    }

    const uniqueNewCandles = normalizedNewCandles;

    // Проверяем инвариант: open[n] === close[n-1] внутри новых свечей
    for (let i = 1; i < uniqueNewCandles.length; i++) {
      const prev = uniqueNewCandles[i - 1];
      const curr = uniqueNewCandles[i];
      if (curr.open !== prev.close) {
        uniqueNewCandles[i] = normalizeCandle({
          ...curr,
          open: prev.close,
        });
      }
    }

    // Если есть существующие свечи, проверяем инвариант на стыке
    if (candlesRef.current.length > 0) {
      const lastExisting = candlesRef.current[0]; // Первая существующая (самая старая)
      const firstNew = uniqueNewCandles[uniqueNewCandles.length - 1]; // Последняя новая (самая новая)
      
      // Если новая свеча идет перед существующей
      if (firstNew.endTime <= lastExisting.startTime) {
        // Исправляем инвариант: open первой существующей = close последней новой
        if (lastExisting.open !== firstNew.close) {
          candlesRef.current[0] = normalizeCandle({
            ...lastExisting,
            open: firstNew.close,
          });
        }
      }
    }

    // Prepend: добавляем новые свечи в начало
    candlesRef.current = [...uniqueNewCandles, ...candlesRef.current];

    // FLOW G6: самая ранняя свеча теперь — первая из добавленных (уже в uniqueNew)
    const oldestNew = uniqueNew[0].startTime;
    if (earliestRealTimeRef.current === null || oldestNew < earliestRealTimeRef.current) {
      earliestRealTimeRef.current = oldestNew;
    }

    // Ограничиваем количество свечей (например, max 3000)
    const MAX_CANDLES = 3000;
    if (candlesRef.current.length > MAX_CANDLES) {
      // Удаляем самые новые (в конце массива)
      candlesRef.current = candlesRef.current.slice(0, MAX_CANDLES);
    }

    // Уведомляем об изменении данных
    onDataChange?.();
  };

  /**
   * 🔥 FLOW T1: Сброс данных при смене timeframe
   * Очищает все свечи и live-свечу для полной переинициализации
   */
  const reset = (): void => {
    candlesRef.current = [];
    liveCandleRef.current = null;
    earliestRealTimeRef.current = null;
    realStartTimesRef.current = new Set();
  };

  const getEarliestRealTime = (): number | null => earliestRealTimeRef.current;

  return {
    initializeFromSnapshot,
    handlePriceUpdate,
    handleCandleClose,
    prependCandles,
    reset,
    getCandles,
    getLiveCandle,
    getEarliestRealTime,
  };
}
