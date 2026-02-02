/**
 * useChart - entry-point графика (оркестратор)
 * 
 * Роль: координация всех подсистем графика
 * 
 * FLOW G1: инфраструктура canvas
 * FLOW G2: слой данных
 * FLOW G3: viewport & auto-fit
 */

import { RefObject, useRef, useEffect, useCallback } from 'react';
import { useCanvasInfrastructure } from './internal/useCanvasInfrastructure';
import { useChartData } from './internal/useChartData';
import { useViewport } from './internal/useViewport';
import { useRenderLoop } from './internal/useRenderLoop';
import { useChartInteractions } from './internal/interactions/useChartInteractions';
import { useHistoryLoader } from './internal/history/useHistoryLoader';
import { useCrosshair } from './internal/crosshair/useCrosshair';
import { useOhlcHover } from './internal/ohlc/useOhlcHover';
import { useCandleCountdown } from './internal/countdown/useCandleCountdown';
import { useCandleMode } from './internal/candleModes/useCandleMode';
import { useIndicators } from './internal/indicators/useIndicators';
import { useDrawings } from './internal/drawings/useDrawings';
import { useDrawingInteractions } from './internal/drawings/useDrawingInteractions';
import { useDrawingEdit } from './internal/drawings/useDrawingEdit';
import { useCandleAnimator } from './internal/useCandleAnimator';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { parseTimeframeToMs } from './internal/utils/timeframe';
import { formatServerTime } from './internal/utils/formatServerTime';
import type { PriceAlert } from './internal/alerts/priceAlerts.types';
import type { InteractionZone } from './internal/interactions/interaction.types';
import type { TerminalSnapshot } from '@/types/terminal';
import type { IndicatorConfig } from './internal/indicators/indicator.types';
import type { Viewport } from './internal/viewport.types';

/** FLOW O: Overlay Registry — canvas читает visibility, UI пишет в registry */
export interface OverlayRegistryParams {
  getVisibleOverlayIds?: () => Set<string>;
  onDrawingAdded?: (overlay: import('./internal/overlay/overlay.types').DrawingOverlay) => void;
  onTradeAdded?: (overlay: import('./internal/overlay/overlay.types').TradeOverlay) => void;
}

interface UseChartParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  timeframe?: string;
  snapshot?: TerminalSnapshot | null;
  instrument?: string;
  payoutPercent?: number;
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  overlayRegistry?: OverlayRegistryParams;
  onInstrumentChange?: (instrumentId: string) => void; // FLOW C-MARKET-ALTERNATIVES: Callback для переключения инструмента
  /** Режим свечей при монтировании (восстанавливается из localStorage) */
  candleMode?: 'classic' | 'heikin_ashi' | 'bars';
}

export type HoverAction = 'CALL' | 'PUT' | null;

interface UseChartReturn {
  setCandleMode: (mode: 'classic' | 'heikin_ashi' | 'bars') => void;
  getCandleMode: () => 'classic' | 'heikin_ashi' | 'bars';
  setFollowMode: (on: boolean) => void;
  getFollowMode: () => boolean;
  toggleFollowMode: () => void;
  /** FLOW F5/F6: вернуться к актуальным свечам, включить follow */
  followLatest: () => void;
  /** FLOW F8: показывать кнопку «Вернуться к текущим» */
  shouldShowReturnToLatest: () => boolean;
  resetYScale: () => void;
  /** FLOW O6: удаление drawing по id (панель вызывает при ❌) */
  removeDrawing: (id: string) => void;
  /** Получить все drawings */
  getDrawings: () => import('./internal/drawings/drawing.types').Drawing[];
  /** Добавить drawing (для восстановления из layout) */
  addDrawing: (drawing: import('./internal/drawings/drawing.types').Drawing) => void;
  /** Очистить все drawings */
  clearDrawings: () => void;
   /** FLOW E1: управление временем экспирации (через ref, не state) */
  setExpirationSeconds: (seconds: number) => void;
  /** FLOW T-OVERLAY: добавить overlay по Trade DTO (HTTP) */
  addTradeOverlayFromDTO: (trade: {
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
  }) => void;
  /** FLOW T-OVERLAY: удалить trade по id */
  removeTrade: (id: string) => void;
  /** FLOW BO-HOVER: установить hover action (CALL/PUT/null) */
  setHoverAction: (action: HoverAction) => void;
  /** FLOW BO-HOVER: получить текущий hover action */
  getHoverAction: () => HoverAction;
  /** FLOW C-MARKET-ALTERNATIVES: обработка клика по альтернативной паре */
  handleAlternativeClick: (instrumentId: string) => void;
  /** FLOW C-MARKET-ALTERNATIVES: обработка hover по альтернативной паре */
  handleAlternativeHover: (mouseX: number, mouseY: number) => number | null;
}

export function useChart({ canvasRef, timeframe = '5s', snapshot, instrument, payoutPercent = 75, digits, activeInstrumentRef, indicatorConfigs = [], drawingMode = null, overlayRegistry, onInstrumentChange, candleMode: initialCandleMode = 'classic' }: UseChartParams): UseChartReturn {
  // FLOW G1: инициализация инфраструктуры canvas
  useCanvasInfrastructure({ canvasRef });

  // Вычисляем timeframeMs
  const timeframeMs = parseTimeframeToMs(timeframe);

  // 🔥 FLOW C-CHART-TYPE-RESET: Reset при монтировании компонента
  // При смене chartType компонент полностью пересоздается через ChartContainer (key),
  // поэтому reset при монтировании гарантирует чистое состояние
  const isInitialMountRef = useRef<boolean>(true);

  // При price:update — только Y (auto-fit), без движения по X. Сдвиг по X только при candle:close и по кнопке «Вернуться».
  const viewportRecalculateYOnlyRef = useRef<() => void>(() => {});

  // FLOW G2: инициализация слоя данных
  const chartData = useChartData({
    onDataChange: () => {
      viewportRecalculateYOnlyRef.current?.();
    },
    timeframeMs,
  });

  // 🔥 FLOW C-INERTIA: Создаем refs для pan инерции (используются в useChartInteractions и useViewport)
  const panVelocityPxPerMsRef = useRef<number>(0);
  const panInertiaActiveRef = useRef<boolean>(false);
  const panInertiaRefs = {
    velocityRef: panVelocityPxPerMsRef,
    activeRef: panInertiaActiveRef,
  };

  // 🔥 FLOW C-INERTIA: Создаем ref для onViewportChange callback (обновляется после создания historyLoader)
  const onViewportChangeRef = useRef<((viewport: Viewport) => void) | null>(null);

  // FLOW G3: инициализация viewport
  const viewport = useViewport({
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    timeframeMs,
    canvasRef, // 🔥 FLOW: Передаем canvasRef для вычисления visibleCandles
    panInertiaRefs,
    onViewportChangeRef, // 🔥 FLOW C-INERTIA: Передаем ref для callback
    getMarketStatus: chartData.getMarketStatus, // FLOW C-MARKET-CLOSED: останавливать инерцию когда рынок закрыт
  });

  viewportRecalculateYOnlyRef.current = viewport.recalculateYOnly;

  // FLOW G7: crosshair (снэп к центру свечи по timeframeMs)
  const crosshair = useCrosshair({
    canvasRef,
    getViewport: viewport.getViewport,
    getTimeframeMs: () => timeframeMs,
  });

  // FLOW G8: OHLC hover panel
  const ohlcHover = useOhlcHover({
    getCrosshair: crosshair.getCrosshair,
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    timeframeMs,
  });

  // FLOW G11: Candle animator (анимация live-свечи)
  const candleAnimator = useCandleAnimator({
    getLiveCandle: chartData.getLiveCandle,
  });

  // FLOW G10: Candle modes
  const candleMode = useCandleMode({
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    initialMode: initialCandleMode,
  });

  // FLOW G12: Indicators
  const indicators = useIndicators({
    getCandles: chartData.getCandles, // Используем source candles (classic)
    indicatorConfigs,
  });

  // FLOW A1: Price Alerts model (ref storage, не влияет на рендер)
  const priceAlertsRef = useRef<PriceAlert[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // FLOW T-OVERLAY: Trades storage (ref-based, не влияет на рендер)
  const tradesRef = useRef<Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    amount?: number; // Сумма сделки для расчета прибыли
  }>>([]);

  const getTrades = (): typeof tradesRef.current => {
    return tradesRef.current;
  };

  const removeTrade = (id: string): void => {
    tradesRef.current = tradesRef.current.filter((t) => t.id !== id);
  };

  const addPriceAlert = (price: number): void => {
    if (!Number.isFinite(price)) return;
    priceAlertsRef.current = [
      ...priceAlertsRef.current,
      {
        id: crypto.randomUUID(),
        price,
        triggered: false,
      },
    ];
  };

  const getPriceAlerts = (): PriceAlert[] => {
    return priceAlertsRef.current;
  };

  // FLOW A2: Interaction zones (hit‑зоны для кликов по canvas)
  const interactionZonesRef = useRef<InteractionZone[]>([]);

  const registerInteractionZone = (zone: InteractionZone): void => {
    interactionZonesRef.current.push(zone);
  };

  const clearInteractionZones = (): void => {
    interactionZonesRef.current = [];
  };

  const getInteractionZones = (): InteractionZone[] => {
    return interactionZonesRef.current;
  };

  // FLOW G14: Drawings
  const drawings = useDrawings();

  // FLOW O7: при создании drawing — добавляем в Overlay Registry (если передан onDrawingAdded)
  const onDrawingAddedRef = useRef(overlayRegistry?.onDrawingAdded);
  onDrawingAddedRef.current = overlayRegistry?.onDrawingAdded;
  const addDrawingWithOverlay = useCallback(
    (d: import('./internal/drawings/drawing.types').Drawing) => {
      drawings.addDrawing(d);
      const cb = onDrawingAddedRef.current;
      if (cb) {
        const name =
          d.type === 'horizontal'
            ? 'Горизонтальная линия'
            : d.type === 'vertical'
              ? 'Вертикальная линия'
              : d.type === 'trend'
                ? 'Трендовая линия'
                : d.type === 'rectangle'
                  ? 'Область'
                  : d.type === 'fibonacci'
                    ? 'Фибоначчи'
                    : d.type === 'parallel-channel'
                      ? 'Параллельный канал'
                      : d.type === 'arrow'
                        ? 'Стрелка'
                        : 'Луч';
        const points: { time: number; price: number }[] =
          d.type === 'trend' || d.type === 'rectangle' || d.type === 'fibonacci' || d.type === 'parallel-channel' || d.type === 'ray' || d.type === 'arrow'
            ? [d.start, d.end]
            : d.type === 'horizontal'
              ? [{ time: 0, price: d.price }]
              : [{ time: d.time, price: 0 }];

        const drawingType: import('./internal/overlay/overlay.types').DrawingOverlay['drawingType'] =
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

  // FLOW G14: Drawing interactions (создание)
  useDrawingInteractions({
    canvasRef,
    getViewport: viewport.getViewport,
    getCrosshair: crosshair.getCrosshair,
    mode: drawingMode || null,
    addDrawing: addDrawingWithOverlay,
  });

  // FLOW T1/T4: Server time — refs, без state/setInterval. Drift compensation через performance.now()
  const serverTimeRef = useRef<{ timestamp: number; utcOffsetMinutes: number } | null>(null);
  const lastSyncTimeRef = useRef(0);

  // FLOW E1: Expiration seconds — хранится в ref, меняется только UI терминала
  const expirationSecondsRef = useRef<number>(60);

  // FLOW BO-HOVER: Hover action state (ref-based, не триггерит render)
  const hoverActionRef = useRef<HoverAction>(null);

  // FLOW BO-HOVER-ARROWS: Предзагрузка изображений стрелок
  const arrowUpImgRef = useRef<HTMLImageElement | null>(null);
  const arrowDownImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Загружаем изображения один раз при монтировании
    const up = new Image();
    up.src = '/images/arrowup.png';
    arrowUpImgRef.current = up;

    const down = new Image();
    down.src = '/images/arrowdown.png';
    arrowDownImgRef.current = down;
  }, []);

  // FLOW BO-HOVER: методы для управления hover action
  const setHoverAction = useCallback((action: HoverAction) => {
    hoverActionRef.current = action;
  }, []);

  const getHoverAction = useCallback((): HoverAction => {
    return hoverActionRef.current;
  }, []);

  // FLOW C-MARKET-ALTERNATIVES: Hitboxes для альтернативных пар
  const marketAlternativesHitboxesRef = useRef<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    instrumentId: string;
  }>>([]);

  // FLOW C-MARKET-ALTERNATIVES: Hovered index для альтернативных пар
  const marketAlternativesHoveredIndexRef = useRef<number | null>(null);

  // FLOW C-MARKET-ALTERNATIVES: Обработка клика по альтернативной паре
  const handleAlternativeClick = useCallback((instrumentId: string) => {
    if (onInstrumentChange) {
      onInstrumentChange(instrumentId);
    }
  }, [onInstrumentChange]);

  // FLOW C-MARKET-ALTERNATIVES: Обработка hover по альтернативной паре
  const handleAlternativeHover = useCallback((mouseX: number, mouseY: number): number | null => {
    const hitboxes = marketAlternativesHitboxesRef.current;
    for (let i = 0; i < hitboxes.length; i++) {
      const box = hitboxes[i];
      if (
        mouseX >= box.x &&
        mouseX <= box.x + box.width &&
        mouseY >= box.y &&
        mouseY <= box.y + box.height
      ) {
        marketAlternativesHoveredIndexRef.current = i;
        return i;
      }
    }
    marketAlternativesHoveredIndexRef.current = null;
    return null;
  }, []);

  // FLOW G16: Drawing edit (hover, select, drag, resize)
  const hoveredDrawingIdRef = useRef<string | null>(null);
  const hoveredDrawingModeRef = useRef<string | null>(null);
  const selectedDrawingIdRef = useRef<string | null>(null);
  const editStateRef = useRef<{ drawingId: string; mode: string } | null>(null);
  const isEditingDrawingRef = useRef<boolean>(false);

  useDrawingEdit({
    canvasRef,
    getViewport: viewport.getViewport,
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
  });

  // FLOW G4: запуск render loop
  // Вычисляем timeframeMs для render loop
  const timeframeMsRef = useRef<number>(timeframeMs);

  useEffect(() => {
    timeframeMsRef.current = timeframeMs;
  }, [timeframeMs]);

  // FLOW T4/T5: отображаемое время = serverTime + drift от последнего WS-апдейта
  const getServerTimeText = useCallback((): string => {
    const s = serverTimeRef.current;
    if (!s) return '';
    const now = s.timestamp + (performance.now() - lastSyncTimeRef.current);
    return formatServerTime(now, s.utcOffsetMinutes);
  }, []);

  // FLOW C-TIMER: получение серверного времени в миллисекундах
  const getServerTimeMs = useCallback((): number => {
    const s = serverTimeRef.current;
    if (!s) return Date.now(); // Fallback на локальное время
    return s.timestamp + (performance.now() - lastSyncTimeRef.current);
  }, []);

  // FLOW E3: единственный источник truth по времени экспирации (в мс)
  const getExpirationTime = useCallback((): number | null => {
    const s = serverTimeRef.current;
    if (!s) return null;
    return s.timestamp + expirationSecondsRef.current * 1000;
  }, []);

  // Получение секунд экспирации для отображения метки
  const getExpirationSeconds = useCallback((): number => {
    return expirationSecondsRef.current;
  }, []);

  // FLOW C1-C3: Таймер обратного отсчета до закрытия свечи
  // FLOW FIX-COUNTDOWN: Не используем getLiveCandle - считаем от квантов времени
  // Должен быть объявлен ДО useRenderLoop, так как используется в нем
  const candleCountdown = useCandleCountdown({
    timeframeMs,
    getServerTimeMs,
  });

  // API для UI терминала: менять только ref, без state/props
  const setExpirationSeconds = (seconds: number): void => {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    expirationSecondsRef.current = seconds;
  };

  useRenderLoop({
    canvasRef,
    getViewport: viewport.getViewport,
    getRenderCandles: candleMode.getRenderCandles,
    getRenderLiveCandle: candleMode.getRenderLiveCandle,
    getAnimatedCandle: candleAnimator.getAnimatedCandle,
    getLiveCandleForRender: candleMode.getLiveCandleForRender,
    updateAnimator: candleAnimator.update,
    getFollowMode: viewport.getFollowMode,
    advanceFollowAnimation: viewport.advanceFollowAnimation,
    advanceYAnimation: viewport.advanceYAnimation,
    getPriceAlerts,
    registerInteractionZone,
    clearInteractionZones,
    getTimeframeMs: () => timeframeMsRef.current,
    getCrosshair: crosshair.getCrosshair,
    getOhlc: ohlcHover.getOhlc,
    updateOhlc: ohlcHover.updateOhlc,
    getMode: candleMode.getMode,
    getIndicatorSeries: indicators.getIndicatorSeries,
    indicatorConfigs,
    getDrawings: drawings.getDrawings,
    getHoveredDrawingId: () => hoveredDrawingIdRef.current,
    getSelectedDrawingId: () => selectedDrawingIdRef.current,
    getVisibleOverlayIds: overlayRegistry?.getVisibleOverlayIds,
    getServerTimeText,
    getServerTimeMs,
    getDigits: () => digits,
    getExpirationTime,
    getExpirationSeconds,
    getTrades,
    getPayoutPercent: () => payoutPercent,
    getTimeframeLabel: candleCountdown.getTimeframeLabel,
    getFormattedCountdown: candleCountdown.getFormattedTime,
    getHoverAction,
    getArrowUpImg: () => arrowUpImgRef.current,
    getArrowDownImg: () => arrowDownImgRef.current,
    advancePanInertia: viewport.advancePanInertia, // 🔥 FLOW C-INERTIA: Pan inertia animation
    getMarketStatus: chartData.getMarketStatus, // FLOW C-MARKET-CLOSED: статус рынка
    getNextMarketOpenAt: chartData.getNextMarketOpenAt, // FLOW C-MARKET-COUNTDOWN: время следующего открытия
    getServerTimeMs, // FLOW C-MARKET-COUNTDOWN: синхронизированное серверное время
    getTopAlternatives: chartData.getTopAlternatives, // FLOW C-MARKET-ALTERNATIVES: альтернативные пары
    marketAlternativesHitboxesRef, // FLOW C-MARKET-ALTERNATIVES: ref для hitboxes
    getMarketAlternativesHoveredIndex: () => marketAlternativesHoveredIndexRef.current, // FLOW C-MARKET-ALTERNATIVES: hovered index
  });

  // FLOW G6/P9: history loading по instrument (id для API ?instrument=)
  // FLOW R-FIX: Используем ТОЛЬКО переданный instrument, без fallback на snapshot
  // чтобы избежать смешивания OTC и REAL инструментов
  const asset = instrument || 'BTCUSD';

  const historyLoader = useHistoryLoader({
    getCandles: chartData.getCandles,
    getEarliestRealTime: chartData.getEarliestRealTime,
    prependCandles: chartData.prependCandles,
    timeframe,
    timeframeMs,
    asset,
  });

  // 🔥 FLOW C-INERTIA: Обновляем callback для onViewportChange после создания historyLoader
  useEffect(() => {
    onViewportChangeRef.current = (newViewport: Viewport) => {
      historyLoader.maybeLoadMore(newViewport);
    };
  }, [historyLoader]);

  // FLOW G5: interactions (pan / zoom)
  const chartInteractions = useChartInteractions({
    canvasRef,
    viewportRef: viewport.viewportRef,
    updateViewport: viewport.updateViewport,
    timeframeMs,
    visibleCandles: viewport.config.visibleCandles,
    onViewportChange: (newViewport) => {
      // После pan/zoom проверяем, нужно ли загрузить историю
      historyLoader.maybeLoadMore(newViewport);
    },
    panInertiaRefs, // 🔥 FLOW C-INERTIA: Передаем refs для инерции
    getIsEditingDrawing: () => isEditingDrawingRef.current, // FLOW G16: Блокируем pan при редактировании
    getMarketStatus: chartData.getMarketStatus, // FLOW C-MARKET-CLOSED: блокируем pan/zoom когда рынок закрыт
    marketAlternativesHitboxesRef, // FLOW C-MARKET-ALTERNATIVES: Hitboxes для альтернативных пар
    onAlternativeClick: handleAlternativeClick, // FLOW C-MARKET-ALTERNATIVES: Обработка клика
    onAlternativeHover: handleAlternativeHover, // FLOW C-MARKET-ALTERNATIVES: Обработка hover
    getDrawingEditState: () => editStateRef.current,
    getHoveredDrawingMode: () => hoveredDrawingModeRef.current,
    setFollowMode: viewport.setFollowMode, // 🔥 FLOW F1: Выключение follow при взаимодействии
    // 🔥 FLOW Y1: Y-scale drag API
    beginYScaleDrag: viewport.beginYScaleDrag,
    updateYScaleDrag: viewport.updateYScaleDrag,
    endYScaleDrag: viewport.endYScaleDrag,
    // FLOW A: Price Alerts
    getInteractionZones,
    addPriceAlert,
    // 🔥 FLOW Y1: Reset Y-Scale при двойном клике на метки цены
    resetYScale: viewport.resetYScale,
    // 🔥 FLOW RETURN-TO-FOLLOW: Планирование возврата после pan/zoom
    scheduleReturnToFollow: viewport.scheduleReturnToFollow,
  });

  // 🔥 FLOW C-CHART-TYPE-RESET: Reset при монтировании компонента
  // При смене chartType компонент полностью пересоздается через ChartContainer (key),
  // поэтому reset при монтировании гарантирует чистое состояние
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      
      // Полный reset при первом монтировании (или при пересоздании из-за смены chartType)
      // Шаг 1: Reset viewport (сброс zoom/pan, follow mode = true)
      viewport.reset();
      
      // Шаг 2: Reset interactions (сброс pan/zoom состояния, инерции)
      chartInteractions.reset();
      
      // Шаг 3: Reset данных свечей
      chartData.reset();
      
      // Шаг 4: Reset анимации
      candleAnimator.reset();
      
      // Шаг 5: Reset history loader
      historyLoader.reset();
      
      // Шаг 6: Reset countdown timer
      candleCountdown.reset();
      
      // Шаг 7: Гарантируем follow mode и остановку инерции
      viewport.setFollowMode(true);
      chartInteractions.stopInertia?.();
    }
  }, []); // Пустой массив зависимостей - только при монтировании

  // FLOW T1 + P8: Инициализация из snapshot; при смене instrument/timeframe — полный reset
  // FLOW P8: если snapshot не для текущего инструмента — только reset, не инициализируем
  // 🔥 FLOW: Timeframe Switch Reset - полный reset при смене timeframe
  const previousTimeframeRef = useRef<string>(timeframe);
  
  useEffect(() => {
    // Проверяем изменение timeframe
    const timeframeChanged = previousTimeframeRef.current !== timeframe;
    if (timeframeChanged) {
      previousTimeframeRef.current = timeframe;
      
      // 🔥 FLOW: Полный reset при смене timeframe
      // Шаг 1: Reset viewport (сброс zoom/pan, follow mode = true)
      viewport.reset();
      
      // Шаг 2: Reset interactions (сброс pan/zoom состояния)
      chartInteractions.reset();
      
      // Шаг 3: Reset данных свечей
      chartData.reset();
      
      // Шаг 4: Reset анимации
      candleAnimator.reset();
      
      // Шаг 5: Reset history loader
      historyLoader.reset();
      
      // Шаг 6: Reset countdown timer (FLOW C6)
      candleCountdown.reset();
    }
    
    if (!snapshot) return;
    if (instrument && snapshot.instrument !== instrument) {
      // Если snapshot не для текущего инструмента — только reset
      if (!timeframeChanged) {
        chartData.reset();
        candleAnimator.reset();
        historyLoader.reset();
        candleCountdown.reset();
      }
      return;
    }

    // Если timeframe не изменился, но snapshot изменился (например, при загрузке)
    if (!timeframeChanged) {
      chartData.reset();
      candleAnimator.reset();
      historyLoader.reset();
      candleCountdown.reset();
    }

    const candles = snapshot.candles.items;
    // FLOW C-MARKET-CLOSED: price может быть null когда рынок закрыт
    const currentPrice = snapshot.price?.value ?? null;
    const currentTime = snapshot.price?.timestamp ?? snapshot.serverTime;

    chartData.initializeFromSnapshot(
      candles, 
      currentPrice, 
      currentTime, 
      timeframeMs,
      snapshot.marketStatus, // FLOW C-MARKET-CLOSED: передаем статус рынка
      snapshot.nextMarketOpenAt, // FLOW C-MARKET-COUNTDOWN: передаем время следующего открытия
      snapshot.topAlternatives ?? [] // FLOW C-MARKET-ALTERNATIVES: передаем альтернативные пары
    );

    // FLOW T2: init server time из snapshot (baseline), drift compensation — lastSyncTime
    serverTimeRef.current = {
      timestamp: snapshot.serverTime,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    };
    lastSyncTimeRef.current = performance.now();

    setTimeout(() => {
      viewport.recalculateViewport();
      viewport.setLatestCandleTime(chartData.getLiveCandle()?.endTime ?? currentTime);
      
      // FLOW IS-0: Initial History Check — проверяем нужно ли догрузить историю при старте
      // Вызывается один раз после инициализации viewport, без user input
      // Использует тот же алгоритм maybeLoadMore, что и при pan/zoom
      const currentViewport = viewport.getViewport();
      if (currentViewport && chartData.getCandles().length > 0) {
        // Проверяем что viewport рассчитан и есть данные
        historyLoader.maybeLoadMore(currentViewport);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, timeframe, instrument]);

  // FLOW P5/P8 + T3: WebSocket — price/candle + server:time (источник истины для времени)
  // 🔥 ИСПРАВЛЕНО: enabled должен быть true всегда, когда есть instrument и activeInstrumentRef
  // snapshot нужен только для инициализации данных, но WebSocket должен работать и без него
  useWebSocket({
    activeInstrumentRef,
    onTradeClose: (tradeId: string) => {
      // Удаляем закрытую сделку с графика
      removeTrade(tradeId);
    },
    onServerTime: (timestamp) => {
      if (serverTimeRef.current) serverTimeRef.current.timestamp = timestamp;
      lastSyncTimeRef.current = performance.now();
    },
    onPriceUpdate: (price, timestamp) => {
      // Логирование только для AUDCHF
      if (instrument === 'AUDCHF') {
        console.log(`[AUDCHF] [useChart] Price update received:`, price, '@', new Date(timestamp).toISOString());
      }
      chartData.handlePriceUpdate(price, timestamp);
      // FLOW F3: якорь «текущее время» для кнопки «Вернуться к текущим»
      viewport.setLatestCandleTime(chartData.getLiveCandle()?.endTime ?? timestamp);
      candleAnimator.onPriceUpdate(price);

      // FLOW A5: Alert Trigger Check
      const prev = lastPriceRef.current;
      lastPriceRef.current = price;
      if (prev === null || !Number.isFinite(prev) || !Number.isFinite(price)) {
        prevPriceRef.current = lastPriceRef.current;
        return;
      }

      prevPriceRef.current = prev;

      const last = lastPriceRef.current!;
      for (const priceAlert of priceAlertsRef.current) {
        if (priceAlert.triggered) continue;

        const crossed =
          (prev < priceAlert.price && last >= priceAlert.price) ||
          (prev > priceAlert.price && last <= priceAlert.price);

        if (crossed) {
          priceAlert.triggered = true;
          // Простое уведомление (frontend-only)
          // eslint-disable-next-line no-alert
          window.alert(`Цена пересекла уровень ${priceAlert.price.toFixed(2)}`);
        }
      }
    },
    onTradeClose: (tradeId: string) => {
      // Удаляем закрытую сделку с графика
      removeTrade(tradeId);
    },
    onCandleClose: (wsCandle, timeframeStr) => {
      // Логирование только для AUDCHF
      if (instrument === 'AUDCHF') {
        console.log(`[AUDCHF] [useChart] Candle close received:`, timeframeStr, wsCandle, 'current timeframe:', timeframe);
      }
      // Фильтруем по timeframe - обрабатываем только свечи текущего timeframe
      if (timeframeStr !== timeframe) {
        if (instrument === 'AUDCHF') {
          console.log('[AUDCHF] [useChart] Candle timeframe mismatch, ignoring');
        }
        return;
      }

      // Конвертируем формат WebSocket candle в SnapshotCandle
      // WebSocket candle имеет: timestamp (startTime), timeframe
      // Нужно вычислить endTime на основе timeframe
      const timeframeMs = parseTimeframeToMs(timeframeStr);

      const snapshotCandle = {
        open: wsCandle.open,
        high: wsCandle.high,
        low: wsCandle.low,
        close: wsCandle.close,
        startTime: wsCandle.timestamp,
        endTime: wsCandle.timestamp + timeframeMs,
      };

      chartData.handleCandleClose(snapshotCandle, snapshotCandle.endTime);
      viewport.setLatestCandleTime(snapshotCandle.endTime);
      candleAnimator.onCandleClose();

      setTimeout(() => {
        if (viewport.getFollowMode()) {
          viewport.recalculateViewport();
        } else {
          viewport.recalculateYOnly();
        }
      }, 0);
    },
    enabled: !!(activeInstrumentRef && instrument), // FLOW WS-1: WebSocket управляет своим состоянием
  });

  /** FLOW F5/F6: вернуться к актуальным свечам, включить follow */
  const followLatest = (): void => {
    viewport.setFollowMode(true);
    viewport.followLatest();
  };

  /** FLOW T-OVERLAY: добавить overlay по Trade DTO (HTTP) */
  const addTradeOverlayFromDTO = (trade: {
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
    amount?: string; // Сумма сделки
  }): void => {
    console.log('[useChart] addTradeOverlayFromDTO called with:', trade);
    
    const entryPrice = parseFloat(trade.entryPrice);
    const openedAt = new Date(trade.openedAt).getTime();
    const expiresAt = new Date(trade.expiresAt).getTime();
    const amount = trade.amount ? parseFloat(trade.amount) : undefined;

    if (!Number.isFinite(entryPrice) || !Number.isFinite(openedAt) || !Number.isFinite(expiresAt)) {
      console.error('[useChart] Invalid trade data', trade, {
        entryPrice,
        openedAt,
        expiresAt,
        amount,
      });
      return;
    }
    

    const tradeData = {
      id: trade.id,
      direction: trade.direction,
      entryPrice,
      openedAt,
      expiresAt,
      amount,
    };

    console.log('[useChart] Adding trade:', tradeData);

    // Добавляем trade в хранилище
    tradesRef.current = [
      ...tradesRef.current.filter(t => t.id !== trade.id),
      tradeData,
    ];


    // Добавляем в overlay registry для отображения в панели
    const onTradeAdded = overlayRegistry?.onTradeAdded;
    if (onTradeAdded) {
      onTradeAdded({
        id: trade.id,
        type: 'trade',
        name: `Сделка ${trade.direction === 'CALL' ? 'ВЫШЕ' : 'НИЖЕ'} @ ${entryPrice.toFixed(5)}`,
        visible: true,
        tradeId: trade.id,
        direction: trade.direction,
        entryPrice,
        openedAt,
        expiresAt,
      });
    }
  };

  return {
    setCandleMode: candleMode.setMode,
    getCandleMode: candleMode.getMode,
    setFollowMode: viewport.setFollowMode,
    getFollowMode: viewport.getFollowMode,
    toggleFollowMode: viewport.toggleFollowMode,
    followLatest,
    shouldShowReturnToLatest: viewport.shouldShowReturnToLatest,
    resetYScale: viewport.resetYScale,
    removeDrawing: drawings.removeDrawing,
    getDrawings: drawings.getDrawings,
    addDrawing: addDrawingWithOverlay,
    clearDrawings: drawings.clearDrawings,
    setExpirationSeconds,
    addTradeOverlayFromDTO,
    removeTrade,
    setHoverAction,
    getHoverAction,
    handleAlternativeClick,
    handleAlternativeHover,
  };
}
