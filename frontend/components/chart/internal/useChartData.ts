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

export type MarketStatus = 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';

interface UseChartDataParams {
  onDataChange?: () => void;
  timeframeMs?: number; // Для нормализации времени исторических свечей
}

interface UseChartDataReturn {
  initializeFromSnapshot: (
    candles: SnapshotCandle[],
    currentPrice: number | null, // FLOW C-MARKET-CLOSED: может быть null
    currentTime: number,
    timeframeMs: number,
    marketStatus: MarketStatus, // FLOW C-MARKET-CLOSED: статус рынка
    nextMarketOpenAt?: string | null, // FLOW C-MARKET-COUNTDOWN: ISO string или null
    topAlternatives?: Array<{ instrumentId: string; label: string; payout: number }> // FLOW C-MARKET-ALTERNATIVES
  ) => void;
  handlePriceUpdate: (price: number, timestamp: number) => void;
  handleCandleClose: (
    closedCandle: SnapshotCandle,
    nextCandleStartTime: number
  ) => void;
  /** FLOW CANDLE-SNAPSHOT: Применить снапшот активной свечи к live-свече (восстановление OHLC после reload) */
  applyActiveCandleSnapshot: (candle: { open: number; high: number; low: number; close: number; timestamp: number }) => void;
  prependCandles: (newCandles: SnapshotCandle[], timeframeMs: number) => void;
  reset: () => void; // 🔥 FLOW T1: сброс данных при смене timeframe
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  /** FLOW G6: реальный timestamp самой ранней свечи (для /api/quotes/candles ?to=) */
  getEarliestRealTime: () => number | null;
  /** FLOW C-MARKET-CLOSED: получить текущий статус рынка */
  getMarketStatus: () => MarketStatus;
  /** FLOW C-MARKET-COUNTDOWN: timestamp следующего открытия рынка */
  getNextMarketOpenAt: () => number | null;
  /** FLOW C-MARKET-ALTERNATIVES: топ альтернативных пар */
  getTopAlternatives: () => Array<{ instrumentId: string; label: string; payout: number }>;
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

  // FLOW R-FIX: Для цен используем fallback на соседние значения
  // НЕ возвращаем 0 для цен - это ломает график (вертикальная палка в 0)
  const safePrice = (value: number, fallback?: number): number => {
    if (!Number.isFinite(value) || value <= 0) {
      if (fallback !== undefined && Number.isFinite(fallback) && fallback > 0) {
        console.warn('[normalizeCandle] Using fallback for invalid price:', value, '→', fallback);
        return fallback;
      }
      // FLOW R-FIX: Если нет fallback, используем разумное значение по умолчанию
      // Это лучше, чем выбрасывать ошибку и ломать весь график
      console.error('[normalizeCandle] Invalid price value with no fallback, using 1.0:', value);
      return 1.0; // Минимальная разумная цена (для валютных пар)
    }
    return value;
  };

  // Для времени используем текущее время как fallback
  const safeTime = (value: number): number => {
    if (!Number.isFinite(value)) {
      console.warn('[normalizeCandle] Invalid time value, using current time:', value);
      return Date.now();
    }
    return value;
  };

  // FLOW R-FIX: Используем close как fallback для open, high, low
  // Если close тоже некорректен, используем разумное значение по умолчанию
  // Это гарантирует, что даже при некорректных данных свеча будет валидной
  let safeClose = safePrice(candle.close);
  
  // Если close тоже некорректен (вернулся fallback 1.0), проверяем другие значения
  if (safeClose === 1.0 && (!Number.isFinite(candle.close) || candle.close <= 0)) {
    // Пробуем использовать open, high, low как источник истины
    const candidates = [candle.open, candle.high, candle.low].filter(v => Number.isFinite(v) && v > 0);
    if (candidates.length > 0) {
      safeClose = Math.max(...candidates);
      console.warn('[normalizeCandle] Using max(open,high,low) as close fallback:', safeClose);
    }
  }
  
  const safeOpen = safePrice(candle.open, safeClose);
  const safeHigh = safePrice(high, Math.max(safeOpen, safeClose));
  const safeLow = safePrice(low, Math.min(safeOpen, safeClose));

  return {
    open: safeOpen,
    high: safeHigh,
    low: safeLow,
    close: safeClose,
    startTime: safeTime(candle.startTime),
    endTime: safeTime(candle.endTime),
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
  /** FLOW C-MARKET-CLOSED: статус рынка */
  const marketStatusRef = useRef<MarketStatus>('OPEN');
  /** FLOW C-MARKET-COUNTDOWN: время следующего открытия рынка (timestamp в мс) */
  const nextMarketOpenAtRef = useRef<number | null>(null);
  /** FLOW C-MARKET-ALTERNATIVES: топ-5 альтернативных пар */
  const topAlternativesRef = useRef<Array<{
    instrumentId: string;
    label: string;
    payout: number;
  }>>([]);

  /**
   * Инициализация из snapshot
   */
  const initializeFromSnapshot = (
    snapshotCandles: SnapshotCandle[],
    currentPrice: number | null, // FLOW C-MARKET-CLOSED: может быть null
    currentTime: number,
    timeframeMs: number,
    marketStatus: MarketStatus, // FLOW C-MARKET-CLOSED: статус рынка
    nextMarketOpenAt?: string | null, // FLOW C-MARKET-COUNTDOWN: ISO string или null
    topAlternatives?: Array<{ instrumentId: string; label: string; payout: number }> // FLOW C-MARKET-ALTERNATIVES
  ): void => {
    // FLOW C-MARKET-CLOSED: Сохраняем статус рынка
    marketStatusRef.current = marketStatus;
    // FLOW C-MARKET-COUNTDOWN: Сохраняем время следующего открытия
    nextMarketOpenAtRef.current = nextMarketOpenAt ? Date.parse(nextMarketOpenAt) : null;
    // FLOW C-MARKET-ALTERNATIVES: Сохраняем альтернативные пары
    topAlternativesRef.current = topAlternatives ?? [];

    if (snapshotCandles.length === 0) {
      // FLOW R-FIX: Если snapshot пустой → создать live-свечу из price/time
      // Но только если currentPrice валиден
      if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        console.warn('[initializeFromSnapshot] Invalid currentPrice, skipping live candle creation:', currentPrice);
        candlesRef.current = [];
        earliestRealTimeRef.current = null;
        realStartTimesRef.current = new Set();
        liveCandleRef.current = null;
        return;
      }
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
      
      // FLOW R-FIX: Пропускаем свечи с некорректными данными
      if (!Number.isFinite(snapshotCandle.close) || snapshotCandle.close <= 0) {
        console.warn('[initializeFromSnapshot] Skipping invalid candle:', snapshotCandle);
        continue;
      }
      
      const normalizedStartTime = firstNormalizedTime + i * timeframeMs;
      const normalizedEndTime = normalizedStartTime + timeframeMs;
      
      try {
        const normalizedCandle = normalizeCandle({
          ...snapshotCandle,
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          isClosed: true,
        });
        
        closedCandles.push(normalizedCandle);
      } catch (error) {
        console.error('[initializeFromSnapshot] Failed to normalize candle:', error, snapshotCandle);
        // Пропускаем некорректную свечу
      }
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

    // FLOW R-FIX: Создаем live-свечу на основе последней закрытой свечи
    // Live-свеча ВСЕГДА наследуется от истории
    // FLOW C-MARKET-CLOSED: Если currentPrice null (рынок закрыт), не создаем live-свечу
    if (closedCandles.length > 0) {
      const lastCandle = closedCandles[closedCandles.length - 1];
      // FLOW R-FIX: Используем close последней свечи как open для live-свечи
      const lastClose = lastCandle.close;
      if (!Number.isFinite(lastClose) || lastClose <= 0) {
        console.warn('[useChartData] Invalid lastCandle.close, using currentPrice:', lastClose);
        if (currentPrice && Number.isFinite(currentPrice) && currentPrice > 0) {
          liveCandleRef.current = createLiveCandle(
            currentPrice,
            lastCandle.endTime,
            currentPrice,
            currentTime
          );
        } else {
          liveCandleRef.current = null;
        }
      } else {
        // FLOW C-MARKET-CLOSED: Если currentPrice null, используем lastClose для обеих цен
        const priceToUse = currentPrice && Number.isFinite(currentPrice) && currentPrice > 0 
          ? currentPrice 
          : lastClose;
        liveCandleRef.current = createLiveCandle(
          lastClose,
          lastCandle.endTime,
          priceToUse,
          currentTime
        );
      }
    } else {
      // FLOW R-FIX: Если snapshot пустой (нет истории), создаем live-свечу с текущей ценой
      // Это может произойти для REAL инструментов без истории в БД
      // В этом случае open = close = currentPrice (нет разрыва)
      // FLOW C-MARKET-CLOSED: Если currentPrice null, не создаем live-свечу
      if (!currentPrice || !Number.isFinite(currentPrice) || currentPrice <= 0) {
        console.warn('[useChartData] Cannot create live candle: invalid currentPrice', currentPrice);
        liveCandleRef.current = null;
      } else {
        liveCandleRef.current = createLiveCandle(
          currentPrice,
          currentTime,
          currentPrice,
          currentTime
        );
      }
    }

    // НЕ вызываем onDataChange здесь - это только для обновлений, не для инициализации
    // Полный пересчет viewport будет вызван в useChart после инициализации
  };

  /**
   * Обработка обновления цены
   */
  const handlePriceUpdate = (price: number, timestamp: number): void => {
    // FLOW R-FIX: Защита от некорректных цен
    if (!Number.isFinite(price) || price <= 0) {
      console.warn('[useChartData] Invalid price received:', price);
      return;
    }

    // Если live-свечи нет → создать
    if (!liveCandleRef.current) {
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      
      // FLOW R-FIX: Live-свеча ВСЕГДА наследуется от последней исторической свечи
      // Если истории нет, используем текущую цену как open (но это не должно происходить)
      const previousClose = lastCandle?.close ?? price;
      
      // FLOW R-FIX: Защита от нулевых значений
      if (!Number.isFinite(previousClose) || previousClose <= 0) {
        console.warn('[useChartData] Cannot create live candle: invalid previousClose', previousClose);
        return;
      }
      
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

    // FLOW R-FIX: Защита от некорректных значений в live-свече
    // Если open = 0, исправляем его из последней исторической свечи
    if (liveCandle.open <= 0 || !Number.isFinite(liveCandle.open)) {
      const lastCandle = candlesRef.current[candlesRef.current.length - 1];
      if (lastCandle && Number.isFinite(lastCandle.close) && lastCandle.close > 0) {
        liveCandle.open = lastCandle.close;
        // Пересчитываем high/low с правильным open
        liveCandle.high = Math.max(lastCandle.close, liveCandle.close);
        liveCandle.low = Math.min(lastCandle.close, liveCandle.close);
      } else {
        // Если истории нет, используем текущую цену
        liveCandle.open = price;
        liveCandle.high = price;
        liveCandle.low = price;
      }
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
   * FLOW CANDLE-SNAPSHOT: Применяет снапшот активной свечи с бэкенда к текущей live-свече
   * 
   * При перезагрузке страницы фронтенд теряет накопленные OHLC live-свечи.
   * Этот метод восстанавливает их из снапшота, который бэкенд отправляет при подписке.
   * 
   * Стратегия MERGE:
   * - open: оставляем фронтендовый (он привязан к close предыдущей свечи для инварианта)
   * - high: берём максимум (бэкенд может знать о более высоком пике до reload)
   * - low: берём минимум (бэкенд может знать о более низком минимуме до reload)
   * - close: оставляем фронтендовый (он актуальнее — обновляется каждым тиком)
   */
  const applyActiveCandleSnapshot = (
    snapshotCandle: { open: number; high: number; low: number; close: number; timestamp: number }
  ): void => {
    const liveCandle = liveCandleRef.current;
    if (!liveCandle) {
      return;
    }

    // Валидация данных снапшота
    if (!Number.isFinite(snapshotCandle.high) || snapshotCandle.high <= 0 ||
        !Number.isFinite(snapshotCandle.low) || snapshotCandle.low <= 0) {
      console.warn('[applyActiveCandleSnapshot] Invalid snapshot data:', snapshotCandle);
      return;
    }

    // MERGE: расширяем high/low live-свечи данными из снапшота
    const mergedHigh = Math.max(liveCandle.high, snapshotCandle.high);
    const mergedLow = Math.min(liveCandle.low, snapshotCandle.low);

    // Проверяем, изменилось ли что-то
    if (mergedHigh === liveCandle.high && mergedLow === liveCandle.low) {
      return; // Ничего не изменилось
    }

    liveCandleRef.current = normalizeCandle({
      ...liveCandle,
      high: mergedHigh,
      low: mergedLow,
    });

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
    // FLOW C-MARKET-COUNTDOWN: сбрасываем статус рынка при reset
    marketStatusRef.current = 'OPEN';
    nextMarketOpenAtRef.current = null;
    // FLOW C-MARKET-ALTERNATIVES: сбрасываем альтернативные пары
    topAlternativesRef.current = [];
  };

  const getEarliestRealTime = (): number | null => earliestRealTimeRef.current;

  /** FLOW C-MARKET-CLOSED: получить текущий статус рынка */
  const getMarketStatus = (): MarketStatus => marketStatusRef.current;

  /** FLOW C-MARKET-COUNTDOWN: получить время следующего открытия рынка */
  const getNextMarketOpenAt = (): number | null => nextMarketOpenAtRef.current;

  /** FLOW C-MARKET-ALTERNATIVES: получить топ-5 альтернативных пар */
  const getTopAlternatives = (): Array<{ instrumentId: string; label: string; payout: number }> => {
    return [...topAlternativesRef.current];
  };

  return {
    initializeFromSnapshot,
    handlePriceUpdate,
    handleCandleClose,
    applyActiveCandleSnapshot,
    prependCandles,
    reset,
    getCandles,
    getLiveCandle,
    getEarliestRealTime,
    getMarketStatus,
    getNextMarketOpenAt,
    getTopAlternatives,
  };
}
