/**
 * useViewport - ядро FLOW G3
 * 
 * Ответственность:
 * - Хранение viewport
 * - Инициализация на основе данных
 * - Auto-fit по Y (обязательно)
 * - Пересчет при изменении данных
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - follow mode
 * - pan / zoom
 * - canvas
 * - render
 * - websocket
 * - useState
 * - side-effects вне хука
 */

import { useRef, useEffect } from 'react';
import type React from 'react';
import type { Viewport, ViewportConfig } from './viewport.types';
import type { Candle } from './chart.types';

interface UseViewportParams {
  getCandles: () => Candle[];
  getLiveCandle: () => Candle | null;
  timeframeMs: number;
  config?: Partial<ViewportConfig>;
}

/** Длительность и эйзинг анимации сдвига в follow mode (как у candle animator) */
const FOLLOW_SHIFT_DURATION_MS = 320;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

interface UseViewportReturn {
  viewportRef: React.RefObject<Viewport | null>;
  getViewport: () => Viewport | null;
  recalculateViewport: () => void;
  recalculateYOnly: () => void; // Только Y, без изменения X
  updateViewport: (newViewport: Viewport) => void;
  config: ViewportConfig;
  // 🔥 FLOW F1 / F3–F5 / F8: Follow mode API
  setFollowMode: (on: boolean) => void;
  getFollowMode: () => boolean;
  toggleFollowMode: () => void;
  /** FLOW F3: обновить якорь текущего времени рынка (price:update / candle:close) */
  setLatestCandleTime: (ts: number) => void;
  /** FLOW F4: мгновенно поставить viewport на актуальные свечи */
  followLatest: () => void;
  /** FLOW F8: показывать кнопку «Вернуться к текущим» */
  shouldShowReturnToLatest: () => boolean;
  /** Плавный сдвиг viewport к цели в follow mode. Вызывать каждый кадр из render loop. */
  advanceFollowAnimation: (now: number) => void;
  // 🔥 FLOW Y1: Y-scale drag API
  beginYScaleDrag: (startY: number) => void;
  updateYScaleDrag: (currentY: number) => void;
  endYScaleDrag: () => void;
  resetYScale: () => void;
}

const DEFAULT_CONFIG: ViewportConfig = {
  visibleCandles: 60,
  yPaddingRatio: 0.1,
  rightPaddingRatio: 0.35, // 35% для follow mode
};

/**
 * Получает видимые свечи в диапазоне времени
 */
function getVisibleCandles(
  candles: Candle[],
  liveCandle: Candle | null,
  timeStart: number,
  timeEnd: number
): Candle[] {
  const visible: Candle[] = [];

  // Добавляем закрытые свечи в диапазоне
  for (const candle of candles) {
    // Свеча видна, если её startTime или endTime попадает в диапазон
    // или если она полностью покрывает диапазон
    if (
      (candle.startTime >= timeStart && candle.startTime <= timeEnd) ||
      (candle.endTime >= timeStart && candle.endTime <= timeEnd) ||
      (candle.startTime <= timeStart && candle.endTime >= timeEnd)
    ) {
      visible.push(candle);
    }
  }

  // Добавляем live-свечу, если она видна
  if (liveCandle) {
    if (
      (liveCandle.startTime >= timeStart && liveCandle.startTime <= timeEnd) ||
      (liveCandle.endTime >= timeStart && liveCandle.endTime <= timeEnd) ||
      (liveCandle.startTime <= timeStart && liveCandle.endTime >= timeEnd)
    ) {
      visible.push(liveCandle);
    }
  }

  return visible;
}

/**
 * Вычисляет priceMin и priceMax для видимых свечей с padding
 */
function calculatePriceRange(
  visibleCandles: Candle[],
  yPaddingRatio: number
): { priceMin: number; priceMax: number } | null {
  if (visibleCandles.length === 0) {
    return null;
  }

  let priceMin = Infinity;
  let priceMax = -Infinity;

  // Находим min(low) и max(high) среди видимых свечей
  for (const candle of visibleCandles) {
    priceMin = Math.min(priceMin, candle.low);
    priceMax = Math.max(priceMax, candle.high);
  }

  // Инвариант: priceMin < priceMax
  if (priceMin >= priceMax) {
    // Если все свечи имеют одинаковую цену, добавляем небольшой диапазон
    const center = priceMin;
    priceMin = center - 1;
    priceMax = center + 1;
  }

  // Добавляем padding
  const range = priceMax - priceMin;
  const padding = range * yPaddingRatio;

  return {
    priceMin: priceMin - padding,
    priceMax: priceMax + padding,
  };
}

export function useViewport({
  getCandles,
  getLiveCandle,
  timeframeMs,
  config = {},
}: UseViewportParams): UseViewportReturn {
  const viewportRef = useRef<Viewport | null>(null);
  const configRef = useRef<ViewportConfig>({ ...DEFAULT_CONFIG, ...config });
  // 🔥 FLOW F1: Follow mode state
  const followModeRef = useRef<boolean>(true); // По умолчанию включен
  // 🔥 FLOW F3: Якорь «где сейчас рынок» — обновляется при price:update / candle:close
  const latestCandleTimeRef = useRef<number | null>(null);
  // 🔥 FLOW F1: Плавный сдвиг — целевой viewport и старт анимации
  const targetViewportRef = useRef<Viewport | null>(null);
  const followAnimationStartRef = useRef<{ viewport: Viewport; time: number } | null>(null);
  // 🔥 FLOW Y1: Y-scale drag state
  const yDragRef = useRef<{
    startY: number;
    startRange: number;
  } | null>(null);

  /**
   * Пересчет viewport на основе текущих данных
   * Используется при инициализации и при candle:close (если follow mode включен)
   */
  const recalculateViewport = (): void => {
    const candles = getCandles();
    const liveCandle = getLiveCandle();
    const { visibleCandles: visibleCount, yPaddingRatio, rightPaddingRatio } = configRef.current;

    // Если данных нет → viewport = null
    if (candles.length === 0 && !liveCandle) {
      viewportRef.current = null;
      return;
    }

    // 🔥 FLOW F1: Follow mode логика — целевой viewport идёт в аниматор, не прыжком
    if (followModeRef.current && liveCandle) {
      // Если follow mode включен, привязываем viewport к live-свече
      const candleStepMs = timeframeMs;
      const totalWindowMs = visibleCount * candleStepMs;
      const rightPaddingMs = totalWindowMs * rightPaddingRatio;
      
      // Правая граница viewport = endTime live-свечи + right padding
      const timeEnd = liveCandle.endTime + rightPaddingMs;
      const timeStart = timeEnd - totalWindowMs;

      // Инвариант: timeStart < timeEnd
      if (timeStart >= timeEnd) {
        const minRange = timeframeMs;
        const vp: Viewport = {
          timeStart: timeEnd - minRange,
          timeEnd,
          priceMin: 0,
          priceMax: 100,
          yMode: 'auto',
        };
        viewportRef.current = vp;
        targetViewportRef.current = null;
        followAnimationStartRef.current = null;
        return;
      }

      const visibleCandlesList = getVisibleCandles(candles, liveCandle, timeStart, timeEnd);
      const currentYMode = viewportRef.current?.yMode || 'auto';
      let priceMin: number;
      let priceMax: number;

      if (currentYMode === 'manual' && viewportRef.current) {
        priceMin = viewportRef.current.priceMin;
        priceMax = viewportRef.current.priceMax;
      } else {
        const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
        if (!priceRange) {
          viewportRef.current = {
            timeStart,
            timeEnd,
            priceMin: 0,
            priceMax: 100,
            yMode: 'auto',
          };
          targetViewportRef.current = null;
          followAnimationStartRef.current = null;
          return;
        }
        priceMin = priceRange.priceMin;
        priceMax = priceRange.priceMax;
      }

      const target: Viewport = {
        timeStart,
        timeEnd,
        priceMin,
        priceMax,
        yMode: currentYMode,
      };

      const current = viewportRef.current;
      if (!current) {
        viewportRef.current = { ...target };
        targetViewportRef.current = null;
        followAnimationStartRef.current = null;
        return;
      }

      // Плавный сдвиг: цель сохраняем, старт анимации задаст advanceFollowAnimation при первом кадре
      targetViewportRef.current = target;
      followAnimationStartRef.current = { viewport: { ...current }, time: 0 };
      return;
    }

    // 🔥 FLOW F1: Если follow mode выключен, НЕ меняем X координаты viewport
    // Сохраняем текущий viewport и обновляем только Y (auto-fit)
    const currentViewport = viewportRef.current;
    if (currentViewport) {
      // Обновляем только Y масштаб
      recalculateYOnly();
      return;
    }

    // Если viewport еще не инициализирован, инициализируем его
    // Определяем timeEnd
    let timeEnd: number;
    if (liveCandle) {
      timeEnd = liveCandle.endTime;
    } else if (candles.length > 0) {
      timeEnd = candles[candles.length - 1].endTime;
    } else {
      viewportRef.current = null;
      return;
    }

    // Вычисляем timeStart на основе visibleCandles
    const timeStart = timeEnd - visibleCount * timeframeMs;

    // Инвариант: timeStart < timeEnd
    if (timeStart >= timeEnd) {
      // Если timeframe слишком большой, используем минимальный диапазон
      const minRange = timeframeMs;
      viewportRef.current = {
        timeStart: timeEnd - minRange,
        timeEnd,
        priceMin: 0,
        priceMax: 100,
        yMode: 'auto',
      };
      return;
    }

    // Получаем видимые свечи
    const visibleCandlesList = getVisibleCandles(candles, liveCandle, timeStart, timeEnd);

    // 🔥 FLOW Y1: Auto-fit по Y только если yMode === 'auto'
    const currentYMode = viewportRef.current?.yMode || 'auto';
    let priceMin: number;
    let priceMax: number;

    if (currentYMode === 'manual' && viewportRef.current) {
      // Сохраняем текущие Y значения
      priceMin = viewportRef.current.priceMin;
      priceMax = viewportRef.current.priceMax;
    } else {
      // Auto-fit по Y: вычисляем priceMin и priceMax
      const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
      if (!priceRange) {
        // Если нет видимых свечей, используем дефолтные значения
        viewportRef.current = {
          timeStart,
          timeEnd,
          priceMin: 0,
          priceMax: 100,
          yMode: 'auto',
        };
        return;
      }
      priceMin = priceRange.priceMin;
      priceMax = priceRange.priceMax;
    }

    // Обновляем viewport
    viewportRef.current = {
      timeStart,
      timeEnd,
      priceMin,
      priceMax,
      yMode: currentYMode,
    };
  };

  /**
   * Обновление только Y масштаба (auto-fit) без изменения X
   * Используется при обновлении данных (price update)
   * 🔥 FLOW Y1: Не обновляет Y если yMode === 'manual'
   */
  const recalculateYOnly = (): void => {
    const currentViewport = viewportRef.current;
    if (!currentViewport) return;

    // 🔥 FLOW Y1: Если yMode === 'manual', не трогаем Y
    if (currentViewport.yMode === 'manual') {
      return;
    }

    const candles = getCandles();
    const liveCandle = getLiveCandle();
    const { yPaddingRatio } = configRef.current;

    // Получаем видимые свечи в текущем viewport (X не меняется!)
    const visibleCandles = getVisibleCandles(
      candles,
      liveCandle,
      currentViewport.timeStart,
      currentViewport.timeEnd
    );

    // Auto-fit по Y: вычисляем priceMin и priceMax
    const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio);

    if (!priceRange) {
      return; // Не меняем viewport если нет видимых свечей
    }

    // Обновляем ТОЛЬКО Y, X остается прежним
    viewportRef.current = {
      ...currentViewport,
      priceMin: priceRange.priceMin,
      priceMax: priceRange.priceMax,
      yMode: 'auto', // Остается auto
    };
  };

  /**
   * Получить текущий viewport
   */
  const getViewport = (): Viewport | null => {
    return viewportRef.current ? { ...viewportRef.current } : null;
  };

  /**
   * Обновить viewport (для pan/zoom)
   * 🔥 FLOW Y1: Y пересчитывается через auto-fit только если yMode === 'auto'
   */
  const updateViewport = (newViewport: Viewport): void => {
    const currentViewport = viewportRef.current;
    const currentYMode = currentViewport?.yMode || 'auto';
    
    // 🔥 FLOW Y1: Если yMode === 'manual', сохраняем текущие Y значения
    if (currentYMode === 'manual' && currentViewport) {
      viewportRef.current = {
        timeStart: newViewport.timeStart,
        timeEnd: newViewport.timeEnd,
        priceMin: currentViewport.priceMin,
        priceMax: currentViewport.priceMax,
        yMode: 'manual',
      };
      return;
    }

    // Получаем актуальные данные для auto-fit Y
    const candles = getCandles();
    const liveCandle = getLiveCandle();

    // Получаем видимые свечи в новом viewport
    const visibleCandles = getVisibleCandles(
      candles,
      liveCandle,
      newViewport.timeStart,
      newViewport.timeEnd
    );

    // Auto-fit по Y: вычисляем priceMin и priceMax
    const { yPaddingRatio } = configRef.current;
    const priceRange = calculatePriceRange(visibleCandles, yPaddingRatio);

    if (!priceRange) {
      // Если нет видимых свечей, используем дефолтные значения
      viewportRef.current = {
        timeStart: newViewport.timeStart,
        timeEnd: newViewport.timeEnd,
        priceMin: 0,
        priceMax: 100,
        yMode: 'auto',
      };
      return;
    }

    // Обновляем viewport с новым X и пересчитанным Y
    viewportRef.current = {
      timeStart: newViewport.timeStart,
      timeEnd: newViewport.timeEnd,
      priceMin: priceRange.priceMin,
      priceMax: priceRange.priceMax,
      yMode: 'auto',
    };
  };

  /** Плавный сдвиг viewport к цели. Вызывать каждый кадр из render loop при follow mode. */
  const advanceFollowAnimation = (now: number): void => {
    if (!followModeRef.current) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
      return;
    }

    const target = targetViewportRef.current;
    const start = followAnimationStartRef.current;
    if (!target || !start) return;

    // Первый кадр анимации — фиксируем время старта
    const startTime = start.time === 0 ? now : start.time;
    if (start.time === 0) {
      followAnimationStartRef.current = { viewport: start.viewport, time: now };
    }

    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / FOLLOW_SHIFT_DURATION_MS);
    const t = easeOutCubic(progress);

    const from = followAnimationStartRef.current ? followAnimationStartRef.current.viewport : target;
    viewportRef.current = {
      timeStart: lerp(from.timeStart, target.timeStart, t),
      timeEnd: lerp(from.timeEnd, target.timeEnd, t),
      priceMin: lerp(from.priceMin, target.priceMin, t),
      priceMax: lerp(from.priceMax, target.priceMax, t),
      yMode: target.yMode,
    };

    if (progress >= 1) {
      viewportRef.current = { ...target };
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    }
  };

  /**
   * FLOW F3: обновить якорь «текущее время рынка» (вызывать из useChart при price:update / candle:close)
   */
  const setLatestCandleTime = (ts: number): void => {
    latestCandleTimeRef.current = ts;
  };

  /**
   * FLOW F4: поставить viewport на актуальные свечи (плавно через advanceFollowAnimation)
   */
  const followLatest = (): void => {
    const liveCandle = getLiveCandle();
    const candles = getCandles();
    const { visibleCandles: visibleCount, yPaddingRatio, rightPaddingRatio } = configRef.current;

    if (candles.length === 0 && !liveCandle) return;

    const anchorTime = liveCandle?.endTime ?? (candles.length > 0 ? candles[candles.length - 1].endTime : null);
    if (anchorTime == null) return;

    const candleStepMs = timeframeMs;
    const totalWindowMs = visibleCount * candleStepMs;
    const rightPaddingMs = totalWindowMs * rightPaddingRatio;
    const timeEnd = anchorTime + rightPaddingMs;
    const timeStart = timeEnd - totalWindowMs;

    if (timeStart >= timeEnd) return;

    const visibleCandlesList = getVisibleCandles(candles, liveCandle ?? null, timeStart, timeEnd);
    const currentYMode = viewportRef.current?.yMode || 'auto';
    let priceMin: number;
    let priceMax: number;

    if (currentYMode === 'manual' && viewportRef.current) {
      priceMin = viewportRef.current.priceMin;
      priceMax = viewportRef.current.priceMax;
    } else {
      const priceRange = calculatePriceRange(visibleCandlesList, yPaddingRatio);
      if (!priceRange) return;
      priceMin = priceRange.priceMin;
      priceMax = priceRange.priceMax;
    }

    const target: Viewport = {
      timeStart,
      timeEnd,
      priceMin,
      priceMax,
      yMode: currentYMode,
    };

    const current = viewportRef.current ? { ...viewportRef.current } : target;
    targetViewportRef.current = target;
    followAnimationStartRef.current = { viewport: current, time: 0 };
  };

  /** FLOW F8: показывать кнопку «Вернуться к текущим», если пользователь уехал влево или выключил follow */
  const EPS_MS = 50;
  const shouldShowReturnToLatest = (): boolean => {
    if (!followModeRef.current) return true;
    const vp = viewportRef.current;
    const latest = latestCandleTimeRef.current;
    if (vp && latest != null && vp.timeEnd < latest - EPS_MS) return true;
    return false;
  };

  // 🔥 FLOW F1: Follow mode методы
  const setFollowMode = (on: boolean): void => {
    followModeRef.current = on;
    if (!on) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    }
  };

  const getFollowMode = (): boolean => {
    return followModeRef.current;
  };

  const toggleFollowMode = (): void => {
    followModeRef.current = !followModeRef.current;
    if (!followModeRef.current) {
      targetViewportRef.current = null;
      followAnimationStartRef.current = null;
    }
    recalculateViewport();
  };

  // 🔥 FLOW Y1: Y-scale drag методы
  const beginYScaleDrag = (startY: number): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const startRange = viewport.priceMax - viewport.priceMin;
    yDragRef.current = {
      startY,
      startRange,
    };

    // Переключаем в manual режим
    viewportRef.current = {
      ...viewport,
      yMode: 'manual',
    };
  };

  const updateYScaleDrag = (currentY: number): void => {
    const viewport = viewportRef.current;
    const dragState = yDragRef.current;
    if (!viewport || !dragState) return;

    // Вычисляем изменение по Y
    const dy = currentY - dragState.startY;
    // Чувствительность: drag вниз (dy > 0) = сжатие, drag вверх (dy < 0) = растягивание
    const scaleFactor = 1 + dy * 0.005; // Вниз = уменьшение, вверх = увеличение

    // Ограничения: относительные к начальному диапазону (чтобы работало на любых парах — BTC, forex и т.д.)
    const minRange = Math.max(1e-10, dragState.startRange * 0.01); // не уже 1% от стартового
    const maxRange = dragState.startRange * 100; // не шире чем в 100 раз
    
    const newRange = Math.max(minRange, Math.min(maxRange, dragState.startRange * scaleFactor));

    // Центр масштабирования - середина текущего диапазона
    const mid = (viewport.priceMin + viewport.priceMax) / 2;
    const newPriceMin = mid - newRange / 2;
    const newPriceMax = mid + newRange / 2;

    // Обновляем viewport
    viewportRef.current = {
      ...viewport,
      priceMin: newPriceMin,
      priceMax: newPriceMax,
      yMode: 'manual',
    };
  };

  const endYScaleDrag = (): void => {
    yDragRef.current = null;
  };

  const resetYScale = (): void => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Переключаем обратно в auto режим и пересчитываем
    viewportRef.current = {
      ...viewport,
      yMode: 'auto',
    };
    recalculateYOnly();
  };

  // Первоначальный расчет viewport
  useEffect(() => {
    recalculateViewport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    viewportRef: viewportRef as React.RefObject<Viewport | null>,
    getViewport,
    recalculateViewport,
    recalculateYOnly,
    updateViewport,
    config: configRef.current,
    // 🔥 FLOW F1 / F3–F5 / F8: Follow mode API
    setFollowMode,
    getFollowMode,
    toggleFollowMode,
    setLatestCandleTime,
    followLatest,
    shouldShowReturnToLatest,
    advanceFollowAnimation,
    // 🔥 FLOW Y1: Y-scale drag API
    beginYScaleDrag,
    updateYScaleDrag,
    endYScaleDrag,
    resetYScale,
  };
}
