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
import type { Viewport } from '../viewport.types';
import { InteractionState, type InteractionZone } from './interaction.types';
import { panViewportTime, zoomViewportTime } from './math';

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
  getIsPointOnDrawing?: (x: number, y: number) => boolean; // FLOW G16-TOUCH: touch на drawing — не начинаем pan
  setFollowMode?: (on: boolean) => void; // 🔥 FLOW F1: Выключение follow при взаимодействии
  // 🔥 FLOW Y1: Y-scale drag API
  beginYScaleDrag?: (startY: number) => void;
  updateYScaleDrag?: (currentY: number) => void;
  endYScaleDrag?: () => void;
  // FLOW A: Price Alerts
  getInteractionZones?: () => InteractionZone[];
  addPriceAlert?: (price: number) => void;
  // 🔥 FLOW C-INERTIA: Pan inertia refs (опционально, если не переданы - создаются внутри)
  panInertiaRefs?: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  };
  // FLOW C-MARKET-ALTERNATIVES: Hitboxes для альтернативных пар
  marketAlternativesHitboxesRef?: React.MutableRefObject<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    instrumentId: string;
  }>>;
  // FLOW C-MARKET-ALTERNATIVES: Callback для переключения инструмента
  onAlternativeClick?: (instrumentId: string) => void;
  // FLOW C-MARKET-ALTERNATIVES: Callback для hover по альтернативной паре
  onAlternativeHover?: (mouseX: number, mouseY: number) => number | null;
  // 🔥 FLOW Y1: Callback для авто-фита Y-шкалы при двойном клике на метки цены
  resetYScale?: () => void;
  // FLOW C-MARKET-CLOSED: блокировка pan/zoom когда рынок закрыт
  getMarketStatus?: () => 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';
  // 🔥 FLOW RETURN-TO-FOLLOW: Callback для планирования возврата в follow mode
  scheduleReturnToFollow?: () => void;
}

const MIN_VISIBLE_CANDLES = 20;
const MAX_VISIBLE_CANDLES = 300; // Увеличено для возможности большего zoom out
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

interface UseChartInteractionsReturn {
  reset: () => void; // 🔥 FLOW: Timeframe Switch Reset - сброс состояния pan/zoom
  // 🔥 FLOW C-INERTIA: Pan inertia API
  getPanVelocity: () => number;
  getInertiaActive: () => boolean;
  stopInertia: () => void;
  // 🔥 FLOW C-INERTIA: Refs для передачи в useViewport
  panInertiaRefs: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  };
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
  getIsPointOnDrawing,
  setFollowMode,
  beginYScaleDrag,
  updateYScaleDrag,
  endYScaleDrag,
  getInteractionZones,
  addPriceAlert,
  panInertiaRefs: externalPanInertiaRefs,
  marketAlternativesHitboxesRef,
  onAlternativeClick,
  onAlternativeHover,
  resetYScale,
  getMarketStatus,
  scheduleReturnToFollow,
}: UseChartInteractionsParams): UseChartInteractionsReturn {
  const interactionStateRef = useRef<InteractionState>({
    isDragging: false,
    lastX: null,
  });
  // 🔥 FLOW Y1: Y-scale drag state
  const yDragStateRef = useRef<boolean>(false);
  // 🔥 FLOW TOUCH-CHART: Touch gesture refs (1 finger = pan, 2 fingers = pinch zoom)
  const touchModeRef = useRef<'none' | 'pan' | 'pinch'>('none');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; centerX: number } | null>(null);
  // 🔥 FLOW C-INERTIA: Pan inertia state (используем переданные refs или создаем свои)
  const internalPanVelocityRef = useRef<number>(0);
  const internalInertiaActiveRef = useRef<boolean>(false);
  const panVelocityPxPerMsRef = externalPanInertiaRefs?.velocityRef || internalPanVelocityRef;
  const inertiaActiveRef = externalPanInertiaRefs?.activeRef || internalInertiaActiveRef;
  const lastMoveTimeRef = useRef<number | null>(null);

  /**
   * Обработчик mouseDown - начало pan или Y-scale drag
   */
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Только левая кнопка

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // FLOW C-MARKET-ALTERNATIVES: Проверяем клик по альтернативным парам (до проверки market closed — клики по списку должны работать)
    if (marketAlternativesHitboxesRef && onAlternativeClick) {
      const hitboxes = marketAlternativesHitboxesRef.current;
      for (const box of hitboxes) {
        if (
          x >= box.x &&
          x <= box.x + box.width &&
          y >= box.y &&
          y <= box.y + box.height
        ) {
          onAlternativeClick(box.instrumentId);
          return;
        }
      }
    }

    // FLOW C-MARKET-CLOSED: когда рынок закрыт, не начинаем pan (но клики по альтернативным парам уже обработаны выше)
    if (getMarketStatus && getMarketStatus() !== 'OPEN') return;

    // 🔥 FLOW C-INERTIA: Сбрасываем инерцию при новом взаимодействии
    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;
    lastMoveTimeRef.current = null;

    // FLOW G16: Если идет редактирование drawing, не начинаем pan
    if (getIsEditingDrawing && getIsEditingDrawing()) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

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
      // 🔥 FLOW C-INERTIA: Прерываем инерцию при начале Y-scale drag
      inertiaActiveRef.current = false;
      panVelocityPxPerMsRef.current = 0;
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isOverCanvas =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    // FLOW C-MARKET-ALTERNATIVES: Обрабатываем hover по альтернативным парам
    let isHoveringAlternatives = false;
    if (onAlternativeHover && !interactionStateRef.current.isDragging && !yDragStateRef.current && isOverCanvas) {
      const hoveredIndex = onAlternativeHover(x, y);
      isHoveringAlternatives = hoveredIndex !== null;
    }

    // FLOW G16: Курсор при редактировании/наведении на drawings; иначе ось Y
    // FLOW C-MARKET-ALTERNATIVES: Проверяем hover по альтернативным парам только если не наведено на drawings
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
      } else if (isHoveringAlternatives) {
        canvas.style.cursor = 'pointer';
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

    // 🔥 FLOW C-INERTIA: Собираем скорость движения мыши
    const now = performance.now();
    const lastTime = lastMoveTimeRef.current;

    if (lastTime !== null) {
      const dt = now - lastTime;
      if (dt > 0) {
        // Скорость в пикселях на миллисекунду (не сглаживаем, берем последнюю реальную скорость)
        panVelocityPxPerMsRef.current = deltaX / dt;
      }
    }

    lastMoveTimeRef.current = now;

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

    // 🔥 FLOW C-INERTIA: Запускаем инерцию, если скорость выше порога
    const velocity = panVelocityPxPerMsRef.current;
    if (Math.abs(velocity) > 0.05) {
      // Порог 0.05 px/ms ≈ правильный UX-порог (ниже — незаметно)
      inertiaActiveRef.current = true;
      setFollowMode?.(false);
    } else {
      // Если скорость слишком мала, останавливаем инерцию
      inertiaActiveRef.current = false;
      panVelocityPxPerMsRef.current = 0;
    }
    
    // 🔥 FLOW RETURN-TO-FOLLOW: ВСЕГДА планируем возврат после pan
    // Если инерция активна — таймер подождёт, потом включит follow mode и остановит инерцию
    scheduleReturnToFollow?.();

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

    // FLOW C-MARKET-CLOSED: когда рынок закрыт, не делаем zoom
    if (getMarketStatus && getMarketStatus() !== 'OPEN') return;

    // 🔥 FLOW C-INERTIA: Прерываем инерцию при zoom
    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;

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

    // 🔥 Zoom НЕ триггерит автовозврат — пользователь сам выбирает масштаб
  };

  const handleMouseLeave = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'default';
  };

  /**
   * Обработчик двойного клика - авто-фит Y-шкалы при клике на метки цены
   */
  const handleDoubleClick = (e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !resetYScale) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = canvas.clientWidth || rect.width;

    // Константа для области меток цены (как в renderAxes.ts)
    const PRICE_LABEL_BG_WIDTH = 60;

    // Проверяем, что клик был в области меток цены (справа)
    if (x >= width - PRICE_LABEL_BG_WIDTH) {
      resetYScale();
    }
  };

  // 🔥 FLOW TOUCH-CHART: Touch helpers
  const getTouchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const getTouchCenterX = (t1: Touch, t2: Touch) => (t1.clientX + t2.clientX) / 2;

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (getMarketStatus && getMarketStatus() !== 'OPEN') return;
    if (getIsEditingDrawing?.()) return;

    if (e.touches.length === 1) {
      // FLOW G16-TOUCH: если touch на drawing — не начинаем pan (drawing edit обработает)
      const canvasEl = canvasRef.current;
      const rect = canvasEl?.getBoundingClientRect();
      if (rect && getIsPointOnDrawing) {
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        if (getIsPointOnDrawing(x, y)) return;
      }
      touchModeRef.current = 'pan';
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      inertiaActiveRef.current = false;
      panVelocityPxPerMsRef.current = 0;
      lastMoveTimeRef.current = null;
    } else if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      touchModeRef.current = 'pinch';
      pinchStartRef.current = {
        distance: getTouchDistance(t1, t2),
        centerX: getTouchCenterX(t1, t2),
      };
      inertiaActiveRef.current = false;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = canvas.getBoundingClientRect();
    const timeRange = viewport.timeEnd - viewport.timeStart;
    const pixelsPerMs = canvas.clientWidth / timeRange;

    if (touchModeRef.current === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const start = touchStartRef.current;
      if (!start) return;

      const deltaX = t.clientX - start.x;

      // 🔥 FLOW C-INERTIA: Собираем скорость для touch pan (как в handleMouseMove)
      const now = performance.now();
      const lastTime = lastMoveTimeRef.current;
      if (lastTime !== null) {
        const dt = now - lastTime;
        if (dt > 0) {
          panVelocityPxPerMsRef.current = deltaX / dt;
        }
      }
      lastMoveTimeRef.current = now;

      const newViewport = panViewportTime({
        viewport,
        deltaX,
        pixelsPerMs,
      });

      setFollowMode?.(false);
      updateViewport(newViewport);
      onViewportChange?.(newViewport);

      touchStartRef.current = { x: t.clientX, y: t.clientY };
    } else if (touchModeRef.current === 'pinch' && e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const pinch = pinchStartRef.current;
      if (!pinch) return;

      const newDistance = getTouchDistance(t1, t2);
      // Инвертировано: разведение пальцев = zoom in, сведение = zoom out (как на линейном графике)
      const zoomFactor = pinch.distance / newDistance;
      const anchorTime = mouseXToTime(pinch.centerX, canvas, viewport);

      const newViewport = zoomViewportTime({
        viewport,
        zoomFactor,
        anchorTime,
        minVisibleCandles: MIN_VISIBLE_CANDLES,
        maxVisibleCandles: MAX_VISIBLE_CANDLES,
        timeframeMs,
      });

      setFollowMode?.(false);
      updateViewport(newViewport);
      onViewportChange?.(newViewport);

      pinchStartRef.current = {
        distance: newDistance,
        centerX: getTouchCenterX(t1, t2),
      };
    }
  };

  const handleTouchEnd = () => {
    if (touchModeRef.current === 'pan') {
      // 🔥 FLOW C-INERTIA: Запускаем инерцию для touch, если скорость выше порога (как в handleMouseUp)
      const velocity = panVelocityPxPerMsRef.current;
      if (Math.abs(velocity) > 0.05) {
        inertiaActiveRef.current = true;
        setFollowMode?.(false);
      } else {
        inertiaActiveRef.current = false;
        panVelocityPxPerMsRef.current = 0;
      }
      scheduleReturnToFollow?.();
    }
    touchModeRef.current = 'none';
    touchStartRef.current = null;
    pinchStartRef.current = null;
  };

  // Подписка на события
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // 🔥 FLOW TOUCH-CHART: Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetYScale]);

  /**
   * 🔥 FLOW: Timeframe Switch Reset - сброс состояния pan/zoom
   * Сбрасывает состояние взаимодействий при смене timeframe
   */
  const reset = (): void => {
    // Сбрасываем состояние pan (прерываем активный drag если есть)
    interactionStateRef.current = {
      isDragging: false,
      lastX: null,
    };

    // 🔥 FLOW TOUCH-CHART: Сбрасываем touch состояние
    touchModeRef.current = 'none';
    touchStartRef.current = null;
    pinchStartRef.current = null;
    
    // Сбрасываем состояние Y-scale drag (прерываем активный drag если есть)
    yDragStateRef.current = false;
    // Завершаем Y-scale drag если он был активен
    if (endYScaleDrag) {
      endYScaleDrag();
    }

    // 🔥 FLOW C-INERTIA: Сбрасываем инерцию
    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;
    lastMoveTimeRef.current = null;
  };

  // 🔥 FLOW C-INERTIA: Методы для доступа к состоянию инерции
  const getPanVelocity = (): number => {
    return panVelocityPxPerMsRef.current;
  };

  const getInertiaActive = (): boolean => {
    return inertiaActiveRef.current;
  };

  const stopInertia = (): void => {
    inertiaActiveRef.current = false;
    panVelocityPxPerMsRef.current = 0;
  };

  return {
    reset,
    getPanVelocity,
    getInertiaActive,
    stopInertia,
    panInertiaRefs: {
      velocityRef: panVelocityPxPerMsRef,
      activeRef: inertiaActiveRef,
    },
  };
}
