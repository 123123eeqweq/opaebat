/**
 * FLOW LINE-5: Главный хук для линейного графика
 * 
 * Оркестрирует все компоненты:
 * - LinePointStore (хранение точек)
 * - LineViewport (временное окно)
 * - LineData (WebSocket интеграция)
 * - RenderLoop (рендеринг)
 */

import { useRef, useEffect, useCallback } from 'react';
import type React from 'react';
import { useLinePointStore, type PricePoint } from './useLinePointStore';
import { useLineViewport, DEFAULT_WINDOW_MS } from './useLineViewport';
import { useLineData, type LiveSegment } from './useLineData';
import { useLinePriceAnimator } from './useLinePriceAnimator';
import { renderLine, calculatePriceRange, renderLiveSegment } from './renderLine';
import { renderPulsatingPoint } from './renderPulsatingPoint';
import { renderTrades } from './renderTrades';
import { 
  renderBackground,
  renderInstrumentWatermark,
  renderGrid, 
  renderPriceAxis,
  renderTimeAxis,
} from '../internal/render/ui';
import { renderPriceLine } from '../internal/render/renderPriceLine';
import { useCrosshair } from '../internal/crosshair/useCrosshair';
import { renderCrosshair, renderCrosshairTimeLabel } from '../internal/render/ui/renderCrosshair';
import { useDrawings } from '../internal/drawings/useDrawings';
import { useDrawingInteractions } from '../internal/drawings/useDrawingInteractions';
import { useDrawingEdit } from '../internal/drawings/useDrawingEdit';
import { renderDrawings } from '../internal/drawings/renderDrawings';
import { useLineIndicators } from './useLineIndicators';
import { renderIndicators } from '../internal/indicators/renderIndicators';
import { renderHoverHighlight, type HoverAction } from '../internal/render/renderHoverHighlight';
import type { IndicatorConfig } from '../internal/indicators/indicator.types';
import type { Drawing } from '../internal/drawings/drawing.types';

interface UseLineChartParams {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Callback для получения данных из WebSocket */
  onPriceUpdate?: (price: number, timestamp: number) => void;
  /** FLOW E: Callback для получения server time (для линии экспирации) */
  onServerTime?: (timestamp: number) => void;
  /** Включен ли график */
  enabled?: boolean;
  /** Количество знаков после запятой для цен (по инструменту) */
  digits?: number;
  /** Процент выплаты для overlay сделок */
  payoutPercent?: number;
  /** ID инструмента для watermark (например "EURUSD_otc") */
  instrument?: string;
  /** FLOW G14: Режим рисования */
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  /** FLOW G12: Конфигурация индикаторов */
  indicatorConfigs?: IndicatorConfig[];
  /** FLOW O: Overlay Registry — для синхронизации drawings с панелью */
  overlayRegistry?: import('../useChart').OverlayRegistryParams;
}

export function useLineChart({
  canvasRef,
  onPriceUpdate,
  onServerTime,
  enabled = true,
  digits,
  payoutPercent = 75,
  instrument,
  drawingMode = null,
  indicatorConfigs = [],
  overlayRegistry,
}: UseLineChartParams) {
  const pointStore = useLinePointStore();
  const viewport = useLineViewport();

  // Ref для instrument (используется в render loop без пересоздания)
  const instrumentRef = useRef(instrument);
  instrumentRef.current = instrument;
  
  // 🔥 FLOW C-CHART-TYPE-RESET: Reset при монтировании компонента
  // При смене chartType компонент полностью пересоздается через ChartContainer (key),
  // поэтому reset при монтировании гарантирует чистое состояние
  const isInitialMountRef = useRef<boolean>(true);
  
  // ✅ ПРАВИЛЬНАЯ АРХИТЕКТУРА: Live сегмент (ephemeral, не мутирует историю)
  const liveSegmentRef = useRef<LiveSegment>(null);
  const setLiveSegment = useCallback((segment: LiveSegment) => {
    liveSegmentRef.current = segment;
  }, []);
  
  // FLOW BO-HOVER: Hover action state (ref-based, не триггерит render)
  const hoverActionRef = useRef<HoverAction>(null);

  // FLOW BO-HOVER-ARROWS: Предзагрузка изображений стрелок
  const arrowUpImgRef = useRef<HTMLImageElement | null>(null);
  const arrowDownImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const up = new Image();
    up.src = '/images/arrowup.png';
    arrowUpImgRef.current = up;

    const down = new Image();
    down.src = '/images/arrowdown.png';
    arrowDownImgRef.current = down;
  }, []);
  
  const lineData = useLineData({ pointStore, viewport, enabled, setLiveSegment });
  const priceAnimator = useLinePriceAnimator();
  /** Первый тик после появления live-сегмента — seed аниматора от fromPrice, без скачка */
  const hadLiveSegmentRef = useRef<boolean>(false);
  /** 🔥 Заморозка price range на время live-сегмента — НЕ передавать animatedPrice в range */
  const frozenPriceRangeRef = useRef<{ min: number; max: number } | null>(null);
  // 🔥 FIX #9: Кэш для setDataBounds — не обновляем каждый кадр если данные не изменились
  const lastDataBoundsMinRef = useRef<number>(0);
  const lastDataBoundsMaxRef = useRef<number>(0);

  // 🔥 FLOW RETURN-TO-FOLLOW: Автоматический возврат в follow mode после pan
  const returnToFollowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const returnToFollowAnimRef = useRef<{
    active: boolean;
    startTime: number;
    startOffset: number; // Насколько viewport отстаёт от live (в ms)
  } | null>(null);
  const RETURN_TO_FOLLOW_DELAY_MS = 2000; // 2 секунды задержка перед возвратом
  const RETURN_TO_FOLLOW_DURATION_MS = 400; // Длительность анимации возврата

  // FLOW E: Expiration seconds — хранится в ref, меняется только UI терминала
  const expirationSecondsRef = useRef<number>(60);
  
  // FLOW E: Server time для расчета времени экспирации
  const serverTimeRef = useRef<{ timestamp: number; lastSyncTime: number } | null>(null);
  
  // FLOW E: Анимация линии экспирации
  const expirationRenderTimeRef = useRef<number | null>(null);
  const expirationTargetTimeRef = useRef<number | null>(null);
  const expirationAnimStartTimeRef = useRef<number | null>(null);
  const expirationAnimStartValueRef = useRef<number | null>(null);
  
  // Синхронизируем onServerTime
  const onServerTimeRef = useRef(onServerTime);
  useEffect(() => {
    onServerTimeRef.current = onServerTime;
  }, [onServerTime]);

  // Обработчик server time (вызывается из useWebSocket)
  const handleServerTime = useCallback((timestamp: number) => {
    serverTimeRef.current = {
      timestamp,
      lastSyncTime: performance.now(),
    };
    onServerTimeRef.current?.(timestamp);
  }, []);

  // FLOW E: единственный источник truth по времени экспирации (в мс)
  const getExpirationTime = useCallback((): number | null => {
    const s = serverTimeRef.current;
    if (!s) return null;
    const now = s.timestamp + (performance.now() - s.lastSyncTime);
    return now + expirationSecondsRef.current * 1000;
  }, []);

  // API для UI терминала: менять только ref, без state/props
  const setExpirationSeconds = useCallback((seconds: number): void => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    expirationSecondsRef.current = seconds;
  }, []);

  // FLOW T-OVERLAY: Trades storage (ref-based, не влияет на рендер)
  const tradesRef = useRef<Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    entryTime?: number;
    amount?: number;
  }>>([]);

  const getTrades = useCallback((): typeof tradesRef.current => {
    return tradesRef.current;
  }, []);

  const removeTrade = useCallback((id: string): void => {
    tradesRef.current = tradesRef.current.filter((t) => t.id !== id);
  }, []);

  /** FLOW T-OVERLAY: добавить overlay по Trade DTO (HTTP) */
  const addTradeOverlayFromDTO = useCallback((trade: {
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
    amount?: string;
  }): void => {
    const entryPrice = parseFloat(trade.entryPrice);
    const openedAt = new Date(trade.openedAt).getTime();
    const expiresAt = new Date(trade.expiresAt).getTime();
    const amount = trade.amount ? parseFloat(trade.amount) : undefined;

    if (!Number.isFinite(entryPrice) || !Number.isFinite(openedAt) || !Number.isFinite(expiresAt)) {
      console.error('[useLineChart] Invalid trade data', trade);
      return;
    }

    const tradeData = {
      id: trade.id,
      direction: trade.direction,
      entryPrice,
      openedAt,
      expiresAt,
      entryTime: openedAt,
      amount,
    };

    tradesRef.current = [
      ...tradesRef.current.filter(t => t.id !== trade.id),
      tradeData,
    ];
  }, []);

  // Crosshair для линейного графика
  const getViewportForCrosshair = useCallback(() => {
    const timePriceViewport = viewport.getTimePriceViewport();
    if (!timePriceViewport) return null;
    return {
      timeStart: timePriceViewport.timeStart,
      timeEnd: timePriceViewport.timeEnd,
      priceMin: timePriceViewport.priceMin,
      priceMax: timePriceViewport.priceMax,
      yMode: 'auto' as const,
    };
  }, [viewport]);
  
  const crosshair = useCrosshair({
    canvasRef,
    getViewport: getViewportForCrosshair,
  });

  // FLOW G14: Drawings
  const drawings = useDrawings();

  const onDrawingAddedRef = useRef(overlayRegistry?.onDrawingAdded);
  useEffect(() => {
    onDrawingAddedRef.current = overlayRegistry?.onDrawingAdded;
  }, [overlayRegistry?.onDrawingAdded]);

  const addDrawingWithOverlay = useCallback(
    (d: Drawing) => {
      drawings.addDrawing(d);
      const cb = onDrawingAddedRef.current;
      if (cb) {
        const name = d.type === 'horizontal' ? 'Горизонтальная линия'
          : d.type === 'vertical' ? 'Вертикальная линия'
          : d.type === 'trend' ? 'Трендовая линия'
          : d.type === 'rectangle' ? 'Область'
          : d.type === 'fibonacci' ? 'Фибоначчи'
          : d.type === 'parallel-channel' ? 'Параллельный канал'
          : d.type === 'arrow' ? 'Стрелка'
          : 'Луч';
        const points: { time: number; price: number }[] =
          d.type === 'trend' || d.type === 'rectangle' || d.type === 'fibonacci' || d.type === 'parallel-channel' || d.type === 'ray' || d.type === 'arrow'
            ? [d.start, d.end]
            : d.type === 'horizontal'
              ? [{ time: 0, price: d.price }]
              : [{ time: d.time, price: 0 }];

        const drawingType: import('../internal/overlay/overlay.types').DrawingOverlay['drawingType'] =
          d.type === 'arrow' ? 'ray' : d.type;

        cb({
          id: d.id,
          type: 'drawing',
          name,
          visible: true,
          drawingType,
          points,
        });
      }
    },
    [drawings]
  );

  useDrawingInteractions({
    canvasRef,
    getViewport: getViewportForCrosshair,
    getCrosshair: crosshair.getCrosshair,
    mode: drawingMode || null,
    addDrawing: addDrawingWithOverlay,
  });

  const hoveredDrawingIdRef = useRef<string | null>(null);
  const hoveredDrawingModeRef = useRef<string | null>(null);
  const selectedDrawingIdRef = useRef<string | null>(null);
  const editStateRef = useRef<{ drawingId: string; mode: string } | null>(null);
  const isEditingDrawingRef = useRef<boolean>(false);

  const hitTestDrawingRef = useRef<(x: number, y: number) => boolean>(() => false);

  useDrawingEdit({
    canvasRef,
    getViewport: getViewportForCrosshair,
    getDrawings: drawings.getDrawings,
    updateDrawing: drawings.updateDrawing,
    onHoverChange: (drawingId, mode) => {
      hoveredDrawingIdRef.current = drawingId;
      hoveredDrawingModeRef.current = mode;
    },
    onEditStateChange: (editState) => {
      selectedDrawingIdRef.current = editState?.drawingId ?? null;
      editStateRef.current = editState ?? null;
      isEditingDrawingRef.current = editState !== null;
    },
    getIsEditing: () => isEditingDrawingRef.current,
    onRegisterHitTest: (fn) => { hitTestDrawingRef.current = fn; },
  });

  const getIsPointOnDrawing = useCallback((x: number, y: number) => hitTestDrawingRef.current(x, y), []);

  const getHoveredDrawingId = useCallback((): string | null => {
    return hoveredDrawingIdRef.current;
  }, []);

  const getSelectedDrawingId = useCallback((): string | null => {
    return selectedDrawingIdRef.current;
  }, []);

  const getIsEditingDrawing = useCallback((): boolean => {
    return isEditingDrawingRef.current;
  }, []);

  // FLOW G12: Indicators для линейного графика
  const INDICATOR_TIMEFRAME_MS = 5000;
  const indicators = useLineIndicators({
    getTicks: pointStore.getAll,
    indicatorConfigs,
    timeframeMs: INDICATOR_TIMEFRAME_MS,
  });

  const onPriceUpdateRef = useRef(onPriceUpdate);
  useEffect(() => {
    onPriceUpdateRef.current = onPriceUpdate;
  }, [onPriceUpdate]);

  const handlePriceUpdate = useCallback(
    (price: number, timestamp: number) => {
      lineData.onPriceUpdate(price, timestamp);
      const seg = liveSegmentRef.current;
      if (seg) {
        if (!hadLiveSegmentRef.current) {
          priceAnimator.seedFrom(seg.fromPrice);
          hadLiveSegmentRef.current = true;
          // Замораживаем price range при появлении live-сегмента
          const historyPoints = pointStore.getAll();
          const currentViewport = viewport.getViewport();
          frozenPriceRangeRef.current = calculatePriceRange(
            historyPoints,
            currentViewport,
            seg,
            undefined
          );
        }
        // 🔥 FIX: Расширяем frozen range если цена выходит за границы (но не сужаем)
        // 🔥 FIX #12: Ограничиваем максимальное расширение — не больше 3x от исходного span
        const frozen = frozenPriceRangeRef.current;
        if (frozen) {
          const originalSpan = frozen.max - frozen.min;
          const maxSpan = (originalSpan || 1) * 3;
          const padding = originalSpan * 0.1 || 1;
          let newMin = frozen.min;
          let newMax = frozen.max;
          if (price < frozen.min + padding) {
            newMin = price - padding;
          }
          if (price > frozen.max - padding) {
            newMax = price + padding;
          }
          // Не позволяем span расти больше maxSpan
          if (newMax - newMin > maxSpan) {
            const center = (newMax + newMin) / 2;
            newMin = center - maxSpan / 2;
            newMax = center + maxSpan / 2;
          }
          if (newMin !== frozen.min || newMax !== frozen.max) {
            frozenPriceRangeRef.current = { min: newMin, max: newMax };
          }
        }
        priceAnimator.onPriceUpdate(price);
      } else {
        hadLiveSegmentRef.current = false;
        frozenPriceRangeRef.current = null;
        priceAnimator.clearLiveState();
      }
      onPriceUpdateRef.current?.(price, timestamp);
    },
    [lineData, priceAnimator, pointStore, viewport]
  );

  // 🔥 FLOW C-INERTIA: Pan inertia для линейного графика
  // Refs передаются из LineChart.tsx через параметры
  const panInertiaRefsRef = useRef<{
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  } | null>(null);

  const setPanInertiaRefs = useCallback((refs: {
    velocityRef: React.MutableRefObject<number>;
    activeRef: React.MutableRefObject<boolean>;
  }) => {
    panInertiaRefsRef.current = refs;
  }, []);

  // 🔥 FLOW RETURN-TO-FOLLOW: Refs для функций (чтобы вызывать из render loop без зависимостей)
  const advancePanInertiaRef = useRef<(now: number) => void>(() => {});
  const advanceReturnToFollowRef = useRef<(now: number) => void>(() => {});

  // 🔥 FLOW C-CHART-TYPE-RESET: Reset при монтировании компонента
  // При смене chartType компонент полностью пересоздается через ChartContainer (key),
  // поэтому reset при монтировании гарантирует чистое состояние
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      
      // Полный reset при первом монтировании (или при пересоздании из-за смены chartType)
      // Шаг 1: Reset данных точек
      pointStore.reset();
      setLiveSegment(null);
      
      // Шаг 2: Reset viewport (сброс zoom/pan, autoFollow = true)
      // 30% right padding для свободного места справа
      const now = Date.now();
      const windowMs = DEFAULT_WINDOW_MS;
      const rightPadding = windowMs * 0.30;
      viewport.setViewport(now + rightPadding - windowMs, now + rightPadding, true); // autoFollow = true
      
      // Шаг 3: autoFollow уже включен в setViewport выше
      
      // Шаг 4: Останавливаем инерцию (если была активна)
      if (panInertiaRefsRef.current) {
        panInertiaRefsRef.current.activeRef.current = false;
        panInertiaRefsRef.current.velocityRef.current = 0;
      }
    }
  }, []); // Пустой массив зависимостей - только при монтировании

  // 🔥 FIX: Ref для render params — RAF loop не перезапускается при каждом re-render.
  // Без ref каждый re-render перезапускал useEffect → teardown/rebuild → frame drops.
  const renderParamsRef = useRef({
    pointStore,
    viewport,
    crosshair,
    digits,
    getExpirationTime,
    getTrades,
    drawings,
    getHoveredDrawingId,
    getSelectedDrawingId,
    indicators,
    indicatorConfigs,
    overlayRegistry,
    lineData,
    priceAnimator,
  });
  renderParamsRef.current = {
    pointStore,
    viewport,
    crosshair,
    digits,
    getExpirationTime,
    getTrades,
    drawings,
    getHoveredDrawingId,
    getSelectedDrawingId,
    indicators,
    indicatorConfigs,
    overlayRegistry,
    lineData,
    priceAnimator,
  };

  /**
   * Рендер-луп на requestAnimationFrame
   */
  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    const canvasElement: HTMLCanvasElement = canvas;
    // 🔥 FIX #14: Кэшируем DPR и перечитываем каждый кадр — корректно при переносе окна между мониторами
    let cachedDpr = window.devicePixelRatio || 1;

    function setupCanvas(): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return null;

      const rect = canvasElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) return null;

      // 🔥 FIX #14: Обновляем DPR каждый кадр
      const currentDpr = window.devicePixelRatio || 1;
      const dprChanged = currentDpr !== cachedDpr;
      if (dprChanged) cachedDpr = currentDpr;

      if (dprChanged || canvasElement.width !== width * cachedDpr || canvasElement.height !== height * cachedDpr) {
        canvasElement.width = width * cachedDpr;
        canvasElement.height = height * cachedDpr;
        ctx.scale(cachedDpr, cachedDpr);
      }

      return { ctx, width, height };
    }

    function render(now: number) {
      const r = renderParamsRef.current;
      if (panInertiaRefsRef.current) {
        advancePanInertiaRef.current(now);
      }
      advanceReturnToFollowRef.current(now);
      r.viewport.advanceFollowAnimation(now);

      const setup = setupCanvas();
      if (!setup) {
        animationFrameId = requestAnimationFrame((timestamp) => render(timestamp));
        return;
      }

      const { ctx, width, height } = setup;

      const historyPoints = r.pointStore.getAll();
      const liveSegment = liveSegmentRef.current;
      const currentViewport = r.viewport.getViewport();

      // 🔥 FLOW PAN-CLAMP: Обновляем границы данных для ограничения pan
      // 🔥 FIX #9: Кэшируем — не создаём объект каждый кадр если данные не изменились
      const firstPoint = historyPoints.length > 0 ? historyPoints[0] : null;
      const lastPoint = historyPoints.length > 0 ? historyPoints[historyPoints.length - 1] : null;
      if (firstPoint && lastPoint) {
        const newMin = firstPoint.time;
        const newMax = lastPoint.time;
        if (newMin !== lastDataBoundsMinRef.current || newMax !== lastDataBoundsMaxRef.current) {
          lastDataBoundsMinRef.current = newMin;
          lastDataBoundsMaxRef.current = newMax;
          r.viewport.setDataBounds(newMin, newMax);
        }
      }

      // Live-сегмент: X интерполируется от fromTime к toTime, Y анимируется
      let visualTime: number | null = null;
      if (liveSegment) {
        r.priceAnimator.update(now);
        const elapsed = now - liveSegment.startedAt;
        const t = Math.min(1, elapsed / 1000); // Прогресс внутри секунды [0..1]
        visualTime = liveSegment.fromTime + (liveSegment.toTime - liveSegment.fromTime) * t;
      }
      const animatedPrice = liveSegment ? r.priceAnimator.getAnimatedPrice() : undefined;

      if (historyPoints.length === 0 && !liveSegment) {
        renderBackground(ctx, width, height);
        renderInstrumentWatermark(ctx, width, height, instrumentRef.current);
        ctx.save();
        ctx.fillStyle = '#888888';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ожидание данных...', width / 2, height / 2);
        ctx.restore();
      } else {
        // История рисуется полностью, live сегмент ПРОДОЛЖАЕТ её от последней точки
        const historyPointsForRender = historyPoints;

        // 🔥 priceRange заморожен на время live-сегмента — НИКОГДА не передаём animatedPrice
        const calculatedPriceRange =
          frozenPriceRangeRef.current ??
          calculatePriceRange(
            historyPoints,
            currentViewport,
            null,
            undefined
          );
        r.viewport.updatePriceRange(calculatedPriceRange.min, calculatedPriceRange.max);
        
        const timePriceViewport = r.viewport.getTimePriceViewport();
        
        if (!timePriceViewport) {
          animationFrameId = requestAnimationFrame(render);
          return;
        }

        const allIndicatorSeries = r.indicators.getIndicatorSeries();
        const visibleIds = r.overlayRegistry?.getVisibleOverlayIds?.();
        const filteredIndicators = visibleIds
          ? allIndicatorSeries.filter((i) => {
              if (i.type === 'Stochastic') {
                const baseId = i.id.replace(/_k$|_d$/, '');
                return visibleIds.has(baseId);
              }
              if (i.type === 'BollingerBands' || i.type === 'KeltnerChannels') {
                const baseId = i.id.replace(/_upper$|_middle$|_lower$/, '');
                return visibleIds.has(baseId);
              }
              if (i.type === 'MACD') {
                const baseId = i.id.replace(/_macd$|_signal$|_histogram$/, '');
                return visibleIds.has(baseId);
              }
              if (i.type === 'Ichimoku') {
                const baseId = i.id.replace(/_tenkan$|_kijun$|_senkouA$|_senkouB$|_chikou$/, '');
                return visibleIds.has(baseId);
              }
              if (i.type === 'ADX') {
                const baseId = i.id.replace(/_adx$|_plusDI$|_minusDI$/, '');
                return visibleIds.has(baseId);
              }
              return visibleIds.has(i.id);
            })
          : allIndicatorSeries;
        
        const ic = r.indicatorConfigs;
        const hasRSI = filteredIndicators.some((i) => i.type === 'RSI') ||
          (visibleIds == null && ic.some((c) => c.type === 'RSI' && c.enabled));
        const hasStochastic = filteredIndicators.some((i) => i.type === 'Stochastic') ||
          (visibleIds == null && ic.some((c) => c.type === 'Stochastic' && c.enabled));
        const hasMomentum = filteredIndicators.some((i) => i.type === 'Momentum') ||
          (visibleIds == null && ic.some((c) => c.type === 'Momentum' && c.enabled));
        const hasAwesomeOscillator = filteredIndicators.some((i) => i.type === 'AwesomeOscillator') ||
          (visibleIds == null && ic.some((c) => c.type === 'AwesomeOscillator' && c.enabled));
        const hasMACD = filteredIndicators.some((i) => i.type === 'MACD') ||
          (visibleIds == null && ic.some((c) => c.type === 'MACD' && c.enabled));
        const hasATR = filteredIndicators.some((i) => i.type === 'ATR') ||
          (visibleIds == null && ic.some((c) => c.type === 'ATR' && c.enabled));
        const hasADX = filteredIndicators.some((i) => i.type === 'ADX') ||
          (visibleIds == null && ic.some((c) => c.type === 'ADX' && c.enabled));
        const rsiHeight = hasRSI ? 120 : 0;
        const stochHeight = hasStochastic ? 120 : 0;
        const momentumHeight = hasMomentum ? 90 : 0;
        const awesomeOscillatorHeight = hasAwesomeOscillator ? 90 : 0;
        const macdHeight = hasMACD ? 100 : 0;
        const atrHeight = hasATR ? 80 : 0;
        const adxHeight = hasADX ? 80 : 0;
        const mainHeight = height - rsiHeight - stochHeight - momentumHeight - awesomeOscillatorHeight - macdHeight - atrHeight - adxHeight;

        // Порядок рендеринга
        renderBackground(ctx, width, height);
        renderInstrumentWatermark(ctx, width, height, instrumentRef.current);
        
        renderGrid({
          ctx,
          viewport: timePriceViewport,
          width,
          height: mainHeight,
        });
        
        // Live точка для area fill (градиент включает live)
        const livePointForArea = liveSegment && animatedPrice !== undefined && visualTime !== null
          ? { time: visualTime, price: animatedPrice }
          : null;

        // История + area fill (градиент включает live точку)
        if (historyPointsForRender.length > 0) {
          renderLine({
            ctx,
            ticks: historyPointsForRender,
            viewport: currentViewport,
            width,
            height: mainHeight,
            priceMin: calculatedPriceRange.min,
            priceMax: calculatedPriceRange.max,
            renderAreaFill: true,
            livePoint: livePointForArea,
          });
        }
        
        // Live сегмент: линия от последней точки к текущей позиции (без area fill — уже нарисован выше)
        if (liveSegment && animatedPrice !== undefined && visualTime !== null) {
          renderLiveSegment({
            ctx,
            fromTime: liveSegment.fromTime,
            toTime: visualTime,
            fromPrice: liveSegment.fromPrice,
            toPrice: animatedPrice,
            viewport: currentViewport,
            width,
            height: mainHeight,
            priceMin: calculatedPriceRange.min,
            priceMax: calculatedPriceRange.max,
          });
        }

        // Pulsating Point — на конце live сегмента
        const pointForPulse = liveSegment && visualTime !== null && animatedPrice !== undefined
          ? { time: visualTime, price: animatedPrice }
          : r.pointStore.getLast();
          
        if (pointForPulse) {
          const timeRange = currentViewport.timeEnd - currentViewport.timeStart;
          if (timeRange > 0) {
            const pointX = ((pointForPulse.time - currentViewport.timeStart) / timeRange) * width;
            const priceRangeValue = calculatedPriceRange.max - calculatedPriceRange.min;
            if (priceRangeValue > 0) {
              const normalizedPrice = (pointForPulse.price - calculatedPriceRange.min) / priceRangeValue;
              const pointY = mainHeight - (normalizedPrice * mainHeight);
              
              renderPulsatingPoint({
                ctx,
                x: pointX,
                y: pointY,
                time: performance.now(),
              });
            }
          }
        }
        
        // Expiration Line — как на свечном: кружок с флажком сверху, линия вниз
        const rawExpirationTimestamp = r.getExpirationTime();
        if (rawExpirationTimestamp != null && Number.isFinite(rawExpirationTimestamp) && currentViewport.timeEnd > currentViewport.timeStart) {
          const EXP_ANIM_DURATION_MS = 320;
          const PRICE_LABEL_AREA_WIDTH = 60;
          const TIME_LABEL_HEIGHT = 25;
          const now = performance.now();
          const currentTarget = expirationTargetTimeRef.current;
          const currentRender = expirationRenderTimeRef.current;

          if (currentRender == null || currentTarget == null) {
            expirationRenderTimeRef.current = rawExpirationTimestamp;
            expirationTargetTimeRef.current = rawExpirationTimestamp;
            expirationAnimStartTimeRef.current = null;
            expirationAnimStartValueRef.current = null;
          } else {
            const delta = Math.abs(rawExpirationTimestamp - currentTarget);
            const SHOULD_RETARGET = delta > 1500;

            if (SHOULD_RETARGET && rawExpirationTimestamp !== currentTarget) {
              expirationTargetTimeRef.current = rawExpirationTimestamp;
              expirationAnimStartTimeRef.current = now;
              expirationAnimStartValueRef.current = currentRender;
            }

            const animStartTime = expirationAnimStartTimeRef.current;
            const animStartValue = expirationAnimStartValueRef.current;
            const target = expirationTargetTimeRef.current ?? rawExpirationTimestamp;

            if (animStartTime != null && animStartValue != null) {
              const elapsed = now - animStartTime;
              const progress = Math.min(1, Math.max(0, elapsed / EXP_ANIM_DURATION_MS));
              const t = progress ** 3 * (progress * (6 * progress - 15) + 10);
              const animated = animStartValue + (target - animStartValue) * t;
              expirationRenderTimeRef.current = animated;
            } else {
              expirationRenderTimeRef.current = target;
            }
          }

          const expirationX = ((expirationRenderTimeRef.current - currentViewport.timeStart) / (currentViewport.timeEnd - currentViewport.timeStart)) * width;
          const maxX = width - PRICE_LABEL_AREA_WIDTH;
          if (expirationX >= 0 && expirationX <= maxX) {
            ctx.save();

            const CIRCLE_RADIUS = 18;
            const isMobile = width < 600; // На мобилке — ниже (под контролами графика)
            const CIRCLE_Y = isMobile ? 78 : 30;
            const circleX = expirationX;
            const circleY = CIRCLE_Y;

            // Кружок на линии экспирации сверху
            ctx.fillStyle = '#40648f';
            ctx.beginPath();
            ctx.arc(circleX, circleY, CIRCLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Финишный флажок (checkered flag) на кружке — 4x3 клетки, яркие белый/черный
            const cols = 5;
            const rows = 3;
            const flagWidth = CIRCLE_RADIUS * 1.1;
            const flagHeight = CIRCLE_RADIUS * 0.78;
            const cellWidth = flagWidth / cols;
            const cellHeight = flagHeight / rows;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.lineWidth = 0.5;
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const cellX = circleX - flagWidth / 2 + col * cellWidth;
                const cellY = circleY - flagHeight / 2 + row * cellHeight;
                ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
                ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
              }
            }

            // Линия экспирации от низа кружка вниз
            ctx.strokeStyle = 'rgba(64, 100, 143, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(expirationX, circleY + CIRCLE_RADIUS);
            ctx.lineTo(expirationX, mainHeight - TIME_LABEL_HEIGHT);
            ctx.stroke();

            ctx.restore();
          }
        }
        
        // Hover Highlight
        const hoverAction = hoverActionRef.current;
        if (hoverAction) {
          const lastHistoryPoint = pointStore.getLast();
          const currentPrice = liveSegment && animatedPrice !== undefined ? animatedPrice : lastHistoryPoint?.price ?? 0;
          
          if (currentPrice > 0) {
            const priceRangeValue = calculatedPriceRange.max - calculatedPriceRange.min;
            if (priceRangeValue > 0) {
              const normalizedPrice = (currentPrice - calculatedPriceRange.min) / priceRangeValue;
              const priceY = mainHeight - (normalizedPrice * mainHeight);
              
              const pointForHover = liveSegment && visualTime !== null
                ? { time: visualTime }
                : lastHistoryPoint;
              
              const timeRange = currentViewport.timeEnd - currentViewport.timeStart;
              const lastDataPointX = pointForHover && timeRange > 0
                ? ((pointForHover.time - currentViewport.timeStart) / timeRange) * width
                : null;
              
              renderHoverHighlight({
                ctx,
                hoverAction,
                priceY,
                width,
                height: mainHeight,
                arrowUpImg: arrowUpImgRef.current,
                arrowDownImg: arrowDownImgRef.current,
                lastDataPointX,
              });
            }
          }
        }
        
        // Trades
        // 🔥 FIX #17: Автоочистка истёкших trade overlays (если trade:close был пропущен)
        const TRADE_EXPIRY_GRACE_MS = 10_000; // 10 секунд после expiresAt
        const currentTimeMs = Date.now();
        const allTrades = r.getTrades();
        if (allTrades.length > 0) {
          const expired = allTrades.filter(t => currentTimeMs > t.expiresAt + TRADE_EXPIRY_GRACE_MS);
          if (expired.length > 0) {
            tradesRef.current = allTrades.filter(t => currentTimeMs <= t.expiresAt + TRADE_EXPIRY_GRACE_MS);
          }
        }
        const trades = tradesRef.current;
        if (trades.length > 0) {
          renderTrades({
            ctx,
            trades,
            viewport: timePriceViewport,
            width,
            height: mainHeight,
            digits: r.digits,
            payoutPercent,
          });
        }
        
        // Drawings
        const allDrawings = r.drawings.getDrawings();
        if (allDrawings.length > 0) {
          renderDrawings({
            ctx,
            drawings: allDrawings,
            viewport: { ...timePriceViewport, yMode: 'auto' as const },
            width,
            height: mainHeight,
            hoveredDrawingId: r.getHoveredDrawingId(),
            selectedDrawingId: r.getSelectedDrawingId(),
          });
        }
        
        // Indicators
        if (filteredIndicators.length > 0) {
          renderIndicators({
            ctx,
            indicators: filteredIndicators,
            indicatorConfigs: r.indicatorConfigs,
            viewport: {
              ...timePriceViewport,
              yMode: 'auto' as const,
            },
            width,
            height: mainHeight,
            rsiHeight,
            stochHeight,
            momentumHeight,
            awesomeOscillatorHeight,
            macdHeight,
            atrHeight,
            adxHeight,
          });
        }
        
        // Price Line — как на свечном (та же линия и метка)
        const lastHistoryPoint = pointStore.getLast();
        const currentPrice = liveSegment && animatedPrice !== undefined ? animatedPrice : lastHistoryPoint?.price ?? 0;
        if (currentPrice > 0 && timePriceViewport) {
          renderPriceLine({
            ctx,
            viewport: { ...timePriceViewport, yMode: 'auto' as const },
            currentPrice,
            width,
            height: mainHeight,
            digits: r.digits,
          });
        }
        
        // Price Axis
        renderPriceAxis({
          ctx,
          viewport: timePriceViewport,
          width,
          height: mainHeight,
          digits: r.digits,
        });
        
        // Time Axis
        renderTimeAxis({
          ctx,
          viewport: timePriceViewport,
          width,
          height: mainHeight,
        });
        
        // Crosshair
        // 🔥 FIX: Передаём mainHeight вместо height для price label и вертикальной линии
        // height включает панели индикаторов (RSI, MACD и т.д.) → кроссхейр рисовался за пределами
        // основной области графика, перекрывая индикаторы
        const crosshairState = r.crosshair.getCrosshair();
        if (crosshairState) {
          renderCrosshair({
            ctx,
            crosshair: crosshairState,
            viewport: timePriceViewport,
            width,
            height: mainHeight,
          });
          
          renderCrosshairTimeLabel(ctx, crosshairState, timePriceViewport, width, height);
        }
      }

      animationFrameId = requestAnimationFrame((timestamp) => render(timestamp));
    }

    render(performance.now());

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // 🔥 FIX: Очищаем returnToFollow таймер при unmount (утечка памяти + callback на мёртвом компоненте)
      if (returnToFollowTimerRef.current) {
        clearTimeout(returnToFollowTimerRef.current);
        returnToFollowTimerRef.current = null;
      }
      returnToFollowAnimRef.current = null;
    };
  }, [enabled, canvasRef]); // renderParamsRef обновляется каждый рендер — RAF loop не перезапускается

  // 🔥 FLOW RETURN-TO-FOLLOW: Функция отмены возврата (вызывается при взаимодействии)
  const cancelReturnToFollow = useCallback(() => {
    if (returnToFollowTimerRef.current) {
      clearTimeout(returnToFollowTimerRef.current);
      returnToFollowTimerRef.current = null;
    }
    returnToFollowAnimRef.current = null;
  }, []);

  // 🔥 FLOW RETURN-TO-FOLLOW: Запланировать возврат в follow mode
  const RIGHT_PADDING_RATIO = 0.30; // Должен совпадать с useLineViewport
  const scheduleReturnToFollow = useCallback(() => {
    cancelReturnToFollow();
    
    returnToFollowTimerRef.current = setTimeout(() => {
      returnToFollowTimerRef.current = null;
      
      // Вычисляем насколько viewport отстаёт от live (с учётом right padding)
      const currentViewport = viewport.getViewport();
      const windowMs = currentViewport.timeEnd - currentViewport.timeStart;
      const rightPadding = windowMs * RIGHT_PADDING_RATIO;
      const now = Date.now();
      const targetTimeEnd = now + rightPadding;
      const offset = targetTimeEnd - currentViewport.timeEnd; // Положительный = отстаём от live
      
      // Если уже близко к live (< 500ms), просто включаем follow
      if (Math.abs(offset) < 500) {
        viewport.resetFollow();
        return;
      }
      
      // Запускаем анимацию возврата
      returnToFollowAnimRef.current = {
        active: true,
        startTime: performance.now(),
        startOffset: offset,
      };
    }, RETURN_TO_FOLLOW_DELAY_MS);
  }, [viewport, cancelReturnToFollow]);

  const zoom = useCallback((factor: number) => {
    cancelReturnToFollow();
    viewport.zoom(factor);
    // Размораживаем price range при zoom — пересчёт для нового viewport
    frozenPriceRangeRef.current = null;
    // Планируем возврат в follow mode
    scheduleReturnToFollow();
  }, [viewport, cancelReturnToFollow, scheduleReturnToFollow]);

  const pan = useCallback((deltaMs: number) => {
    cancelReturnToFollow();
    viewport.pan(deltaMs);
    // Размораживаем price range при pan — пересчёт для нового viewport
    frozenPriceRangeRef.current = null;
    // НЕ планируем возврат здесь — pan вызывается часто, планируем только после mouseUp/inertia
  }, [viewport, cancelReturnToFollow]);

  const resetFollow = useCallback(() => {
    cancelReturnToFollow();
    viewport.resetFollow();
  }, [viewport, cancelReturnToFollow]);

  const setAutoFollow = useCallback((enabled: boolean) => {
    viewport.setAutoFollow(enabled);
  }, [viewport]);

  const advancePanInertia = useCallback((now: number) => {
    const refs = panInertiaRefsRef.current;
    if (!refs) return;
    const currentViewport = viewport.getViewport();
    if (currentViewport.autoFollow) {
      refs.activeRef.current = false;
      refs.velocityRef.current = 0;
      return;
    }

    if (!refs.activeRef.current) return;

    const velocity = refs.velocityRef.current;
    const PAN_STOP_EPSILON = 0.02;
    if (Math.abs(velocity) < PAN_STOP_EPSILON) {
      // Скорость слишком мала, останавливаем инерцию
      refs.activeRef.current = false;
      refs.velocityRef.current = 0;
      // 🔥 FLOW RETURN-TO-FOLLOW: Планируем возврат когда инерция остановилась
      scheduleReturnToFollow();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dt = 16;
    const deltaX = velocity * dt;

    // Вычисляем pixelsPerMs
    const timeRange = currentViewport.timeEnd - currentViewport.timeStart;
    const pixelsPerMs = canvas.clientWidth / timeRange;

    // Конвертируем deltaX в deltaMs (инвертируем для интуитивного pan)
    const deltaMs = -deltaX / pixelsPerMs;

    // Pan viewport
    viewport.pan(deltaMs);

    // Уменьшаем скорость с friction
    const PAN_FRICTION = 0.92;
    refs.velocityRef.current *= PAN_FRICTION;
  }, [viewport, canvasRef, scheduleReturnToFollow]);

  // 🔥 FLOW RETURN-TO-FOLLOW: Обработка анимации возврата
  const advanceReturnToFollow = useCallback((now: number) => {
    const anim = returnToFollowAnimRef.current;
    if (!anim || !anim.active) return;

    // 🔥 FIX #11: Не анимируем возврат пока инерция ещё активна — они «борются» друг с другом
    const refs = panInertiaRefsRef.current;
    if (refs && refs.activeRef.current) return;

    const elapsed = now - anim.startTime;
    const progress = Math.min(1, elapsed / RETURN_TO_FOLLOW_DURATION_MS);
    
    // easeOutCubic для плавного замедления
    const eased = 1 - Math.pow(1 - progress, 3);
    
    // Интерполируем offset от startOffset к 0
    const currentOffset = anim.startOffset * (1 - eased);
    
    // Устанавливаем viewport (с учётом right padding)
    const currentViewport = viewport.getViewport();
    const windowMs = currentViewport.timeEnd - currentViewport.timeStart;
    const rightPadding = windowMs * 0.30; // RIGHT_PADDING_RATIO
    const liveNow = Date.now();
    const targetEnd = liveNow + rightPadding - currentOffset;
    
    viewport.setViewport(targetEnd - windowMs, targetEnd, false);
    
    if (progress >= 1) {
      // Анимация завершена — включаем follow mode
      returnToFollowAnimRef.current = null;
      viewport.resetFollow();
    }
  }, [viewport]);

  // 🔥 FLOW RETURN-TO-FOLLOW: Обновляем refs для render loop
  useEffect(() => {
    advancePanInertiaRef.current = advancePanInertia;
  }, [advancePanInertia]);

  useEffect(() => {
    advanceReturnToFollowRef.current = advanceReturnToFollow;
  }, [advanceReturnToFollow]);

  const reset = useCallback(() => {
    pointStore.reset();
    setLiveSegment(null);
    priceAnimator.reset();
    hadLiveSegmentRef.current = false;
    frozenPriceRangeRef.current = null;
  }, [pointStore, setLiveSegment, priceAnimator]);

  const initializeFromSnapshot = useCallback((snapshot: {
    points: Array<{ time: number; price: number }>;
    currentPrice: number;
    serverTime: number;
  }) => {
    pointStore.reset();
    setLiveSegment(null);
    priceAnimator.reset();
    hadLiveSegmentRef.current = false;
    frozenPriceRangeRef.current = null;

    const RIGHT_PADDING = 0.30; // Должен совпадать с useLineViewport

    // FLOW R-LINE-5: Обработка пустого snapshot (нормально для REAL инструментов)
    if (snapshot.points.length === 0) {
      // Инициализируем viewport от текущего времени (live-only режим)
      const now = snapshot.serverTime || Date.now();
      const rightPadding = DEFAULT_WINDOW_MS * RIGHT_PADDING;
      viewport.setViewport(now + rightPadding - DEFAULT_WINDOW_MS, now + rightPadding, true);
      return;
    }

    // Если есть точки, инициализируем с right padding и autoFollow = true
    pointStore.appendMany(snapshot.points);
    // Используем serverTime (текущее время), а не lastTime точек
    const now = snapshot.serverTime || Date.now();
    const rightPadding = DEFAULT_WINDOW_MS * RIGHT_PADDING;
    viewport.setViewport(now + rightPadding - DEFAULT_WINDOW_MS, now + rightPadding, true);
  }, [pointStore, viewport, setLiveSegment, priceAnimator]);

  const prependHistory = useCallback((points: Array<{ time: number; price: number }>) => {
    pointStore.prepend(points);
  }, [pointStore]);

  const setHoverAction = useCallback((action: HoverAction) => {
    hoverActionRef.current = action;
  }, []);

  return {
    handlePriceUpdate,
    handleServerTime,
    removeTrade,
    reset,
    zoom,
    pan,
    resetFollow,
    setAutoFollow,
    setExpirationSeconds,
    addTradeOverlayFromDTO,
    removeDrawing: drawings.removeDrawing,
    getDrawings: drawings.getDrawings,
    addDrawing: drawings.addDrawing,
    clearDrawings: drawings.clearDrawings,
    initializeFromSnapshot,
    prependHistory,
    setHoverAction,
    getViewport: viewport.getViewport,
    getPoints: pointStore.getAll,
    getIsEditingDrawing,
    getIsPointOnDrawing,
    setPanInertiaRefs,
    advancePanInertia,
    scheduleReturnToFollow,
  };
}
