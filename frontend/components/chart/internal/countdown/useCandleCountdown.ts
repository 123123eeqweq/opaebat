/**
 * useCandleCountdown - FLOW C1-C3: Таймер обратного отсчета до закрытия свечи
 * 
 * Ответственность:
 * - Вычисление оставшегося времени до закрытия свечи
 * - Обновление каждую секунду через отдельный таймер
 * - Форматирование времени (MM:SS)
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - RAF
 * - chart redraw
 * - viewport
 * - useState (используем refs)
 */

import { useRef, useEffect, useCallback } from 'react';

interface UseCandleCountdownParams {
  timeframeMs: number;
  /** FLOW CL-6: slotEnd от сервера - источник истины для таймера */
  getSlotEnd?: () => number | null;
  getServerTimeMs?: () => number; // Fallback на локальное время
}

interface UseCandleCountdownReturn {
  getRemainingSeconds: () => number; // Оставшееся время в секундах
  getFormattedTime: () => string; // Форматированное время (MM:SS или "Xs" для малых таймфреймов)
  getTimeframeLabel: () => string; // Метка таймфрейма (M15, 5s, etc.)
  reset: () => void; // FLOW C6: сброс таймера
}

/**
 * FLOW C3: Форматирование времени
 */
function formatRemainingTime(remainingMs: number, timeframeMs: number): string {
  // Всегда показываем формат MM:SS
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * FLOW C3: Форматирование метки таймфрейма
 */
function formatTimeframeLabel(timeframeMs: number): string {
  if (timeframeMs < 60000) {
    // Секунды
    return `${timeframeMs / 1000}s`;
  } else if (timeframeMs < 3600000) {
    // Минуты
    return `M${timeframeMs / 60000}`;
  } else {
    // Часы
    return `H${timeframeMs / 3600000}`;
  }
}

export function useCandleCountdown({
  timeframeMs,
  getSlotEnd,
  getServerTimeMs,
}: UseCandleCountdownParams): UseCandleCountdownReturn {
  const remainingSecondsRef = useRef<number>(0);

  /**
   * FLOW CL-6: Вычисление оставшегося времени от slotEnd сервера
   */
  const calculateRemainingSeconds = useCallback(() => {
    // FLOW CL-6: Используем slotEnd от сервера как источник истины
    const slotEnd = getSlotEnd ? getSlotEnd() : null;
    if (slotEnd !== null) {
      const now = getServerTimeMs ? getServerTimeMs() : Date.now();
      const remainingMs = slotEnd - now;
      remainingSecondsRef.current = Math.max(0, Math.floor(remainingMs / 1000));
      return;
    }
    
    // Fallback: вычисляем локально (не должно происходить в нормальной работе)
    const now = getServerTimeMs ? getServerTimeMs() : Date.now();
    const slotStart = Math.floor(now / timeframeMs) * timeframeMs;
    const candleCloseTime = slotStart + timeframeMs;
    const remainingMs = candleCloseTime - now;
    remainingSecondsRef.current = Math.max(0, Math.floor(remainingMs / 1000));
  }, [timeframeMs, getSlotEnd, getServerTimeMs]);

  /**
   * FLOW C2: Запуск таймера (отдельный 1s interval)
   * 
   * FLOW FIX-COUNTDOWN: Таймер обновляется строго раз в 1000ms
   * Не зависит от тиков, WS, snapshot - только от времени
   */
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    // Останавливаем предыдущий таймер если есть
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Обновляем сразу
    calculateRemainingSeconds();

    // Запускаем таймер на 1 секунду
    timerIntervalRef.current = setInterval(() => {
      // FLOW FIX-COUNTDOWN: Просто пересчитываем от текущего времени
      calculateRemainingSeconds();
    }, 1000);
  }, [calculateRemainingSeconds]);

  /**
   * FLOW C6: Reset логика
   * 
   * FLOW FIX-COUNTDOWN: При смене TF просто перезапускаем таймер
   */
  const reset = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    remainingSecondsRef.current = 0;
    // Перезапускаем таймер
    startTimer();
  }, [startTimer]);

  // Запускаем таймер при монтировании и при изменении зависимостей
  useEffect(() => {
    startTimer();

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [startTimer]);

  const getRemainingSeconds = useCallback((): number => {
    return remainingSecondsRef.current;
  }, []);

  const getFormattedTime = useCallback((): string => {
    const remainingMs = remainingSecondsRef.current * 1000;
    return formatRemainingTime(remainingMs, timeframeMs);
  }, [timeframeMs]);

  const getTimeframeLabel = useCallback((): string => {
    return formatTimeframeLabel(timeframeMs);
  }, [timeframeMs]);

  return {
    getRemainingSeconds,
    getFormattedTime,
    getTimeframeLabel,
    reset,
  };
}
