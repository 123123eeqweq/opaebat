/**
 * FLOW LP-4: WebSocket Integration для линейного графика
 * 
 * ✅ ПРАВИЛЬНАЯ АРХИТЕКТУРА:
 * - История (immutable) - никогда не мутируется
 * - Live сегмент (ephemeral) - существует отдельно, не сохраняется
 * 
 * Ответственность:
 * - Подписка ТОЛЬКО на price:update (не на candle:close!)
 * - Live сегмент для отображения (каждый тик)
 * - Запись price point раз в секунду (не каждый тик!)
 * - Обновление viewport (auto-follow)
 */

import { useCallback, useRef, useEffect } from 'react';
import type { PricePoint } from './useLinePointStore';

/**
 * Live сегмент — плавная интерполяция от последней точки к текущей позиции.
 * X плавно движется от fromTime к toTime (конец секунды).
 * Y анимируется к текущей цене через useLinePriceAnimator.
 */
export type LiveSegment = {
  fromTime: number;   // время последней исторической точки
  toTime: number;     // цель: fromTime + 1000 (конец секунды)
  fromPrice: number;  // цена последней точки
  startedAt: number;  // performance.now() при создании
} | null;

interface UseLineDataParams {
  pointStore: {
    push: (point: PricePoint) => void;
    getLast: () => PricePoint | null;
    getAll: () => PricePoint[];
  };
  viewport: {
    followNow: (now: number) => void;
  };
  enabled?: boolean;
  /** Callback для установки live сегмента (для рендеринга) */
  setLiveSegment?: (segment: LiveSegment) => void;
}

export function useLineData({ pointStore, viewport, enabled = true, setLiveSegment }: UseLineDataParams) {
  const enabledRef = useRef(enabled);
  // FLOW LP-4: Отслеживаем последнюю секунду для записи точки
  const lastSecondRef = useRef<number | null>(null);
  /** Live-сегмент: X интерполируется к концу секунды, Y анимируется */
  const liveSegmentRef = useRef<LiveSegment>(null);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * Обработчик обновления цены из WebSocket.
   * Live-сегмент создаётся один раз на секунду: X плавно едет к концу секунды, Y анимируется.
   */
  const onPriceUpdate = useCallback(
    (price: number, timestamp: number) => {
      if (!enabledRef.current) return;

      const second = Math.floor(timestamp / 1000) * 1000;
      const lastSecond = lastSecondRef.current;

      // Запись точки в историю раз в секунду
      if (lastSecond !== second) {
        pointStore.push({ time: second, price });
        lastSecondRef.current = second;

        // Сбрасываем live сегмент — секунда закрылась
        liveSegmentRef.current = null;
        setLiveSegment?.(null);

        // 🔥 Вызываем followNow только если уже есть исторические данные (snapshot загружен)
        // До загрузки snapshot у нас будет только 1 точка (текущий тик)
        // После snapshot будет много точек
        if (pointStore.getAll().length > 1) {
          viewport.followNow(second);
        }
      }

      // Берём последнюю точку ПОСЛЕ возможной записи
      const lastHistoryPoint = pointStore.getLast();

      // Live-сегмент: линия от последней точки к текущей позиции (X интерполируется, Y анимируется)
      if (lastHistoryPoint) {
        if (!liveSegmentRef.current) {
          const seg: LiveSegment = {
            fromTime: lastHistoryPoint.time,
            toTime: lastHistoryPoint.time + 1000, // Цель: конец секунды
            fromPrice: lastHistoryPoint.price,
            startedAt: performance.now(),
          };
          liveSegmentRef.current = seg;
          setLiveSegment?.({ ...seg });
        }
      } else {
        liveSegmentRef.current = null;
        setLiveSegment?.(null);
      }
    },
    [pointStore, viewport, setLiveSegment]
  );

  return {
    onPriceUpdate,
  };
}
