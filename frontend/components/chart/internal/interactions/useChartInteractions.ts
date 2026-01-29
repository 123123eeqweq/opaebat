/**
 * useChartInteractions - ядро FLOW G5
 * 
 * Ответственность:
 * - Обработка mouse/wheel событий
 * - Pan (drag)
 * - Zoom (wheel)
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - follow mode
 * - WebSocket
 * - render
 * - изменение data layer
 * - useState
 * - side-effects вне хука
 */

import { useEffect, useRef, RefObject } from 'react';
import type React from 'react';
import { InteractionState, type InteractionZone } from './interaction.types';
import { panViewportTime, zoomViewportTime } from './math';
import type { Viewport } from '../viewport.types';

interface UseChartInteractionsParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  viewportRef: React.RefObject<Viewport | null>;
  updateViewport: (newViewport: Viewport) => void;
  timeframeMs: number;
  visibleCandles: number;
  onViewportChange?: (viewport: Viewport) => void; // Callback после изменения viewport (для загрузки истории)
  getIsEditingDrawing?: () => boolean; // FLOW G16: Проверка, идет ли редактирование drawing
  getDrawingEditState?: () => { mode: string } | null; // FLOW G16: режим при драге (move / resize-*)
  getHoveredDrawingMode?: () => string | null; // FLOW G16: режим при наведении на drawing
  setFollowMode?: (on: boolean) => void; // 🔥 FLOW F1: Выключение follow при взаимодействии
  // 🔥 FLOW Y1: Y-scale drag API
  beginYScaleDrag?: (startY: number) => void;
  updateYScaleDrag?: (currentY: number) => void;
  endYScaleDrag?: () => void;
  // FLOW A: Price Alerts
  getInteractionZones?: () => InteractionZone[];
  addPriceAlert?: (price: number) => void;
}

const MIN_VISIBLE_CANDLES = 20;
const MAX_VISIBLE_CANDLES = 300;
const ZOOM_SENSITIVITY = 0.1; // 10% за шаг колесика
const PRICE_AXIS_WIDTH = 80; // 🔥 FLOW Y1: Ширина правой оси цены

/**
 * Конвертирует X координату мыши в время
 */
function mouseXToTime(
  mouseX: number,
  canvas: HTMLCanvasElement,
  viewport: Viewport
): number {
  const rect = canvas.getBoundingClientRect();
  const relativeX = mouseX - rect.left;
  const timeRange = viewport.timeEnd - viewport.timeStart;
  const pixelsPerMs = canvas.clientWidth / timeRange;
  return viewport.timeStart + relativeX / pixelsPerMs;
}

/**
 * 🔥 FLOW Y1: Проверяет, находится ли мышь над правой осью цены
 */
function isMouseOnPriceAxis(
  mouseX: number,
  canvas: HTMLCanvasElement
): boolean {
  const rect = canvas.getBoundingClientRect();
  const relativeX = mouseX - rect.left;
  return relativeX > canvas.clientWidth - PRICE_AXIS_WIDTH;
}

export function useChartInteractions({
  canvasRef,
  viewportRef,
  updateViewport,
  timeframeMs,
  visibleCandles,
  onViewportChange,
  getIsEditingDrawing,
  getDrawingEditState,
  getHoveredDrawingMode,
  setFollowMode,
  beginYScaleDrag,
  updateYScaleDrag,
  endYScaleDrag,
  getInteractionZones,
  addPriceAlert,
}: UseChartInteractionsParams): void {
  const interactionStateRef = useRef<InteractionState>({
    isDragging: false,
    lastX: null,
  });
  // 🔥 FLOW Y1: Y-scale drag state
  const yDragStateRef = useRef<boolean>(false);

  /**
   * Обработчик mouseDown - начало pan или Y-scale drag
   */
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Только левая кнопка

    // FLOW G16: Если идет редактирование drawing, не начинаем pan
    if (getIsEditingDrawing && getIsEditingDrawing()) {
      return;
    }

    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // FLOW A3: Проверяем hit‑зоны (например, "+" для price alert)
    const zones = getInteractionZones ? getInteractionZones() : [];
    if (zones.length > 0) {
      for (const zone of zones) {
        if (
          x >= zone.x &&
          x <= zone.x + zone.width &&
          y >= zone.y &&
          y <= zone.y + zone.height
        ) {
          if (zone.type === 'add-alert' && addPriceAlert) {
            addPriceAlert(zone.price);
          }
          // Не начинаем pan / Y-scale при клике по зоне
          return;
        }
      }
    }

    // 🔥 FLOW Y1: Проверяем, находится ли мышь над правой осью цены
    if (isMouseOnPriceAxis(e.clientX, canvas)) {
      // Начинаем Y-scale drag
      yDragStateRef.current = true;
      beginYScaleDrag?.(y);
      return;
    }

    // Обычный pan
    interactionStateRef.current = {
      isDragging: true,
      lastX: x,
    };
  };

  /**
   * Обработчик mouseMove - pan или Y-scale drag
   */
  const handleMouseMove = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const isOverCanvas =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    // FLOW G16: Курсор при редактировании/наведении на drawings; иначе ось Y
    if (isOverCanvas) {
      const drawingMode =
        (getIsEditingDrawing?.() && getDrawingEditState?.()?.mode) ?? getHoveredDrawingMode?.() ?? null;
      if (drawingMode === 'move' || drawingMode === 'resize-start' || drawingMode === 'resize-end') {
        canvas.style.cursor = 'move';
      } else if (drawingMode === 'resize-offset') {
        canvas.style.cursor = 'ns-resize';
      } else if (drawingMode === 'resize-tl' || drawingMode === 'resize-br') {
        canvas.style.cursor = 'nwse-resize';
      } else if (drawingMode === 'resize-tr' || drawingMode === 'resize-bl') {
        canvas.style.cursor = 'nesw-resize';
      } else if (yDragStateRef.current || isMouseOnPriceAxis(e.clientX, canvas)) {
        canvas.style.cursor = 'ns-resize';
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      canvas.style.cursor = 'default';
    }

    // 🔥 FLOW Y1: Если идет Y-scale drag
    if (yDragStateRef.current) {
      updateYScaleDrag?.(y);
      return;
    }

    const state = interactionStateRef.current;
    if (!state.isDragging || state.lastX === null) return;

    // FLOW G16: Если идет редактирование drawing, не обрабатываем pan
    if (getIsEditingDrawing && getIsEditingDrawing()) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    const currentX = e.clientX - rect.left;
    const deltaX = currentX - state.lastX;

    // Вычисляем pixelsPerMs
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const pixelsPerMs = canvas.clientWidth / timeRange;

    // Pan viewport
    const newViewport = panViewportTime({
      viewport,
      deltaX,
      pixelsPerMs,
    });

    // 🔥 FLOW F1: Выключаем follow mode при pan
    setFollowMode?.(false);

    // Обновляем viewport (Y пересчитается через auto-fit в updateViewport)
    updateViewport(newViewport);

    // Вызываем callback для загрузки истории (FLOW G6)
    onViewportChange?.(newViewport);

    interactionStateRef.current.lastX = currentX;
  };

  /**
   * Обработчик mouseUp - конец pan или Y-scale drag
   */
  const handleMouseUp = () => {
    // 🔥 FLOW Y1: Если идет Y-scale drag, завершаем его и сбрасываем курсор
    if (yDragStateRef.current) {
      yDragStateRef.current = false;
      endYScaleDrag?.();
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = 'default';
      return;
    }

    interactionStateRef.current = {
      ...interactionStateRef.current,
      isDragging: false,
      lastX: null,
    };
  };

  /**
   * Обработчик wheel - zoom
   */
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    // Определяем направление зума
    // deltaY > 0 = скролл вниз = zoom out (уменьшение) → zoomFactor > 1
    // deltaY < 0 = скролл вверх = zoom in (увеличение) → zoomFactor < 1
    // В zoomViewportTime: newTimeRange = currentTimeRange * zoomFactor
    // zoomFactor > 1 → увеличиваем диапазон → уменьшаем масштаб (zoom out)
    // zoomFactor < 1 → уменьшаем диапазон → увеличиваем масштаб (zoom in)
    // ИНВЕРТИРУЕМ: скролл вверх (deltaY < 0) = увеличение масштаба (zoomFactor < 1)
    //              скролл вниз (deltaY > 0) = уменьшение масштаба (zoomFactor > 1)
    const zoomFactor = e.deltaY < 0 ? 1 - ZOOM_SENSITIVITY : 1 + ZOOM_SENSITIVITY;

    // Получаем время в точке курсора
    const anchorTime = mouseXToTime(e.clientX, canvas, viewport);

    // Zoom viewport
    const newViewport = zoomViewportTime({
      viewport,
      zoomFactor,
      anchorTime,
      minVisibleCandles: MIN_VISIBLE_CANDLES,
      maxVisibleCandles: MAX_VISIBLE_CANDLES,
      timeframeMs,
    });

    // 🔥 FLOW F1: Выключаем follow mode при zoom
    setFollowMode?.(false);

    // Обновляем viewport (Y пересчитается через auto-fit в updateViewport)
    updateViewport(newViewport);

    // Вызываем callback для загрузки истории (FLOW G6)
    onViewportChange?.(newViewport);
  };

  const handleMouseLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
  };

  // Подписка на события
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
