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
  digits?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  indicatorConfigs?: IndicatorConfig[];
  drawingMode?: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null;
  overlayRegistry?: OverlayRegistryParams;
}

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
}

export function useChart({ canvasRef, timeframe = '5s', snapshot, instrument, digits, activeInstrumentRef, indicatorConfigs = [], drawingMode = null, overlayRegistry }: UseChartParams): UseChartReturn {
  // FLOW G1: инициализация инфраструктуры canvas
  useCanvasInfrastructure({ canvasRef });

  // Вычисляем timeframeMs
  const timeframeMs = parseTimeframeToMs(timeframe);

  // При price:update — только Y (auto-fit), без движения по X. Сдвиг по X только при candle:close и по кнопке «Вернуться».
  const viewportRecalculateYOnlyRef = useRef<() => void>(() => {});

  // FLOW G2: инициализация слоя данных
  const chartData = useChartData({
    onDataChange: () => {
      viewportRecalculateYOnlyRef.current?.();
    },
    timeframeMs,
  });

  // FLOW G3: инициализация viewport
  const viewport = useViewport({
    getCandles: chartData.getCandles,
    getLiveCandle: chartData.getLiveCandle,
    timeframeMs,
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
    updateAnimator: candleAnimator.update,
    getFollowMode: viewport.getFollowMode,
    advanceFollowAnimation: viewport.advanceFollowAnimation,
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
    getTrades,
  });

  // FLOW G6/P9: history loading по instrument (id для API ?instrument=)
  const asset = instrument || snapshot?.instrument || 'BTCUSD';

  const historyLoader = useHistoryLoader({
    getCandles: chartData.getCandles,
    getEarliestRealTime: chartData.getEarliestRealTime,
    prependCandles: chartData.prependCandles,
    timeframe,
    timeframeMs,
    asset,
  });

  // FLOW G5: interactions (pan / zoom)
  useChartInteractions({
    canvasRef,
    viewportRef: viewport.viewportRef,
    updateViewport: viewport.updateViewport,
    timeframeMs,
    visibleCandles: viewport.config.visibleCandles,
    onViewportChange: (newViewport) => {
      // После pan/zoom проверяем, нужно ли загрузить историю
      historyLoader.maybeLoadMore(newViewport);
    },
    getIsEditingDrawing: () => isEditingDrawingRef.current, // FLOW G16: Блокируем pan при редактировании
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
  });

  // FLOW T1 + P8: Инициализация из snapshot; при смене instrument/timeframe — полный reset
  // FLOW P8: если snapshot не для текущего инструмента — только reset, не инициализируем
  useEffect(() => {
    if (!snapshot) return;
    if (instrument && snapshot.instrument !== instrument) {
      chartData.reset();
      candleAnimator.reset();
      historyLoader.reset();
      return;
    }

    chartData.reset();
    candleAnimator.reset();
    historyLoader.reset();

    const candles = snapshot.candles.items;
    const currentPrice = snapshot.price.value;
    const currentTime = snapshot.price.timestamp;

    chartData.initializeFromSnapshot(candles, currentPrice, currentTime, timeframeMs);

    // FLOW T2: init server time из snapshot (baseline), drift compensation — lastSyncTime
    serverTimeRef.current = {
      timestamp: snapshot.serverTime,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
    };
    lastSyncTimeRef.current = performance.now();

    setTimeout(() => {
      viewport.recalculateViewport();
      viewport.setLatestCandleTime(chartData.getLiveCandle()?.endTime ?? currentTime);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, timeframe, instrument]);

  // FLOW P5/P8 + T3: WebSocket — price/candle + server:time (источник истины для времени)
  useWebSocket({
    activeInstrumentRef,
    onServerTime: (timestamp) => {
      if (serverTimeRef.current) serverTimeRef.current.timestamp = timestamp;
      lastSyncTimeRef.current = performance.now();
    },
    onPriceUpdate: (price, timestamp) => {
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
    onCandleClose: (wsCandle, timeframeStr) => {
      // Фильтруем по timeframe - обрабатываем только свечи текущего timeframe
      if (timeframeStr !== timeframe) {
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
    enabled: !!snapshot,
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
  }): void => {
    const entryPrice = parseFloat(trade.entryPrice);
    const openedAt = new Date(trade.openedAt).getTime();
    const expiresAt = new Date(trade.expiresAt).getTime();

    if (!Number.isFinite(entryPrice) || !Number.isFinite(openedAt) || !Number.isFinite(expiresAt)) {
      console.error('[useChart] Invalid trade data', trade);
      return;
    }

    // Добавляем trade в хранилище
    tradesRef.current = [
      ...tradesRef.current.filter(t => t.id !== trade.id),
      {
        id: trade.id,
        direction: trade.direction,
        entryPrice,
        openedAt,
        expiresAt,
      },
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
  };
}
