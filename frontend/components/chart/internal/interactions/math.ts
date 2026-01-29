/**
 * math.ts - чистая математика для pan/zoom
 * 
 * БЕЗ REACT, БЕЗ SIDE-EFFECTS
 * Только вычисления
 * 
 * FLOW G5: Interactions math
 */

import type { Viewport } from '../viewport.types';

interface PanViewportTimeParams {
  viewport: Viewport;
  deltaX: number;
  pixelsPerMs: number;
}

interface ZoomViewportTimeParams {
  viewport: Viewport;
  zoomFactor: number;
  anchorTime: number;
  minVisibleCandles: number;
  maxVisibleCandles: number;
  timeframeMs: number;
}

/**
 * Смещает viewport по времени (pan)
 * 
 * @returns НОВЫЙ viewport (не мутирует входные данные)
 */
export function panViewportTime({
  viewport,
  deltaX,
  pixelsPerMs,
}: PanViewportTimeParams): Viewport {
  // Конвертируем deltaX в миллисекунды
  const deltaTime = deltaX / pixelsPerMs;

  // Вычисляем новый диапазон времени
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeStart = viewport.timeStart - deltaTime;
  const newTimeEnd = newTimeStart + timeRange;

  // Инвариант: timeStart < timeEnd
  if (newTimeStart >= newTimeEnd) {
    // Если нарушен инвариант, возвращаем исходный viewport
    return { ...viewport };
  }

  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}

/**
 * Масштабирует viewport по времени (zoom)
 * 
 * @returns НОВЫЙ viewport (не мутирует входные данные)
 */
export function zoomViewportTime({
  viewport,
  zoomFactor,
  anchorTime,
  minVisibleCandles,
  maxVisibleCandles,
  timeframeMs,
}: ZoomViewportTimeParams): Viewport {
  const currentTimeRange = viewport.timeEnd - viewport.timeStart;
  const newTimeRange = currentTimeRange * zoomFactor;

  // Ограничиваем диапазон
  const minTimeRange = minVisibleCandles * timeframeMs;
  const maxTimeRange = maxVisibleCandles * timeframeMs;
  const clampedTimeRange = Math.max(minTimeRange, Math.min(maxTimeRange, newTimeRange));

  // Вычисляем позицию якоря относительно текущего viewport
  const anchorRatio = (anchorTime - viewport.timeStart) / currentTimeRange;

  // Вычисляем новый диапазон относительно якоря
  const newTimeStart = anchorTime - clampedTimeRange * anchorRatio;
  const newTimeEnd = newTimeStart + clampedTimeRange;

  // Инвариант: timeStart < timeEnd
  if (newTimeStart >= newTimeEnd) {
    // Если нарушен инвариант, возвращаем исходный viewport
    return { ...viewport };
  }

  return {
    ...viewport,
    timeStart: newTimeStart,
    timeEnd: newTimeEnd,
  };
}
