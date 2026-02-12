/**
 * useRenderLoop - render loop на requestAnimationFrame
 * 
 * Ответственность:
 * - Управление RAF loop
 * - Вызов renderEngine
 * - Остановка при unmount
 * 
 * FLOW G4: Render Engine
 */

import { useEffect, useRef, RefObject } from 'react';
import { getChartSettings } from '@/lib/chartSettings';
import { renderEngine } from './render/renderEngine';
import { renderCrosshair, renderCrosshairTimeLabel } from './crosshair/renderCrosshair';
import { renderOhlcPanel } from './ohlc/renderOhlcPanel';
import { renderIndicators } from './indicators/renderIndicators';
import { renderDrawings } from './drawings/renderDrawings';
import { renderPriceAlerts } from './alerts/renderPriceAlerts';
import { renderTrades } from './trades/renderTrades';
import { renderCountdown } from './countdown/renderCountdown';
import { renderHoverHighlight, type HoverAction } from './render/renderHoverHighlight';
import { renderMarketClosedOverlay, type MarketStatus, type MarketCountdown } from './render/renderMarketOverlay';
import { renderMarketAlternatives } from './render/renderMarketAlternatives';
import { renderGrid } from './render/renderGrid';
import { renderAxes } from './render/renderAxes';
import { getMarketCountdown } from './utils/marketCountdown';
import type { Viewport } from './viewport.types';
import type { Candle } from './chart.types';
import type { CrosshairState } from './crosshair/crosshair.types';
import type { OhlcData } from './ohlc/ohlc.types';
import type { CandleMode } from './candleModes/candleMode.types';
import type { IndicatorSeries, IndicatorConfig } from './indicators/indicator.types';
import type { Drawing } from './drawings/drawing.types';
import type { PriceAlert } from './alerts/priceAlerts.types';
import type { InteractionZone } from './interactions/interaction.types';

interface UseRenderLoopParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  getViewport: () => Viewport | null;
  getRenderCandles: () => Candle[]; // FLOW G10: Трансформированные свечи для рендера
  getRenderLiveCandle: () => Candle | null; // FLOW G10: Трансформированная live-свеча
  getAnimatedCandle: () => Candle | null; // FLOW G11: Анимированная live-свеча
  getLiveCandleForRender: (animatedCandle: Candle | null) => Candle | null; // FLOW G10+11: live с учётом анимации и режима (HA)
  updateAnimator: (now: number) => void; // FLOW G11: Обновление аниматора
  getFollowMode: () => boolean; // FLOW F1: follow mode — для плавного сдвига viewport
  advanceFollowAnimation: (now: number) => void; // FLOW F1: плавный сдвиг при follow
  advanceYAnimation: (now: number) => void; // 🔥 FLOW Y-SMOOTH: плавная анимация Y-оси
  getTimeframeMs: () => number; // Функция для получения актуального значения
  getCrosshair: () => CrosshairState | null; // FLOW G7: Crosshair
  getOhlc: () => OhlcData | null; // FLOW G8: OHLC panel
  updateOhlc: () => void; // FLOW G8: Обновление OHLC
  getMode: () => CandleMode; // FLOW G10: Режим отображения
  getIndicatorSeries: () => IndicatorSeries[]; // FLOW G12: Индикаторы
  indicatorConfigs: IndicatorConfig[]; // Конфигурация индикаторов
  getDrawings: () => Drawing[]; // FLOW G14: Drawings
  getHoveredDrawingId: () => string | null; // FLOW G16: Hover state
  getSelectedDrawingId: () => string | null; // FLOW G16: Selected state
  /** FLOW O5: если передан — рисуем только оверлеи с id из этого Set */
  getVisibleOverlayIds?: () => Set<string>;
  /** FLOW T6: серверное время в левом верхнем углу canvas (overlay, не скроллится) */
  getServerTimeText?: () => string;
  /** Количество знаков после запятой для цен (по инструменту, напр. 5 для forex) */
  getDigits?: () => number | undefined;
  // FLOW A: Price Alerts
  getPriceAlerts: () => PriceAlert[];
  registerInteractionZone: (zone: InteractionZone) => void;
  clearInteractionZones: () => void;
  /** FLOW E: время экспирации в мс от эпохи (server time anchor) */
  getExpirationTime?: () => number | null;
  /** FLOW E: получение секунд экспирации для отображения метки */
  getExpirationSeconds?: () => number;
  /** FLOW T-OVERLAY: получить все активные сделки */
  getTrades?: () => Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    amount?: number;
  }>;
  /** Процент выплаты для overlay сделок */
  getPayoutPercent?: () => number;
  /** FLOW C: Countdown timer */
  getTimeframeLabel?: () => string;
  getFormattedCountdown?: () => string;
  /** FLOW BO-HOVER: получить текущий hover action */
  getHoverAction?: () => HoverAction;
  /** FLOW BO-HOVER-ARROWS: получить изображения стрелок */
  getArrowUpImg?: () => HTMLImageElement | null;
  getArrowDownImg?: () => HTMLImageElement | null;
  /** 🔥 FLOW C-INERTIA: Pan inertia animation */
  advancePanInertia?: (now: number) => void;
  /** FLOW C-MARKET-CLOSED: получить статус рынка */
  getMarketStatus?: () => MarketStatus;
  /** FLOW C-MARKET-COUNTDOWN: получить время следующего открытия рынка (timestamp в мс) */
  getNextMarketOpenAt?: () => number | null;
  /** FLOW C-MARKET-COUNTDOWN: получить синхронизированное серверное время (timestamp в мс) */
  getServerTimeMs?: () => number;
  /** FLOW C-MARKET-ALTERNATIVES: получить топ-5 альтернативных пар */
  getTopAlternatives?: () => Array<{ instrumentId: string; label: string; payout: number }>;
  /** FLOW C-MARKET-ALTERNATIVES: ref для hitboxes альтернативных пар */
  marketAlternativesHitboxesRef?: React.MutableRefObject<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    instrumentId: string;
  }>>;
  /** FLOW C-MARKET-ALTERNATIVES: получить индекс наведенной альтернативной пары */
  getMarketAlternativesHoveredIndex?: () => number | null;
}

export function useRenderLoop({
  canvasRef,
  getViewport,
  getRenderCandles,
  getRenderLiveCandle,
  getAnimatedCandle,
  getLiveCandleForRender,
  updateAnimator,
  getFollowMode,
  advanceFollowAnimation,
  advanceYAnimation,
  getTimeframeMs,
  getCrosshair,
  getOhlc,
  updateOhlc,
  getMode,
  getIndicatorSeries,
  indicatorConfigs,
  getDrawings,
  getHoveredDrawingId,
  getSelectedDrawingId,
  getVisibleOverlayIds,
  getServerTimeText,
  getServerTimeMs,
  getDigits,
  getPriceAlerts,
  registerInteractionZone,
  clearInteractionZones,
    getExpirationTime,
    getExpirationSeconds,
    getTrades,
    getPayoutPercent,
  getTimeframeLabel,
  getFormattedCountdown,
    getHoverAction,
    getArrowUpImg,
    getArrowDownImg,
    advancePanInertia,
    getMarketStatus,
    getNextMarketOpenAt,
    getTopAlternatives,
    marketAlternativesHitboxesRef,
    getMarketAlternativesHoveredIndex,
}: UseRenderLoopParams): void {
  const rafIdRef = useRef<number | null>(null);
  // FLOW E: плавная анимация вертикальной линии экспирации при смене expirationSeconds
  const expirationRenderTimeRef = useRef<number | null>(null);
  const expirationTargetTimeRef = useRef<number | null>(null);
  const expirationAnimStartTimeRef = useRef<number | null>(null);
  const expirationAnimStartValueRef = useRef<number | null>(null);
  // Кэш для фонового изображения
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2d context for render loop');
      return;
    }

    // Render function
    const render = (now: number) => {
      // FLOW G11: Обновляем аниматор каждый кадр
      updateAnimator(now);
      // 🔥 FLOW C-INERTIA: Pan inertia (до follow animation, так как они взаимоисключающие)
      // Инвариант: pan inertia и follow mode не могут работать вместе
      if (advancePanInertia && !getFollowMode()) {
        advancePanInertia(now);
      }
      // FLOW F1: Плавный сдвиг viewport в follow mode
      if (getFollowMode()) {
        advanceFollowAnimation(now);
      }

      // 🔥 FLOW Y-SMOOTH: Плавная анимация Y-оси (всегда, независимо от режима)
      advanceYAnimation(now);

      // FLOW A2: очищаем interaction zones перед новым кадром
      clearInteractionZones();

      const viewport = getViewport();
      
      // Если viewport === null → не рисовать
      if (!viewport) {
        rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));
        return;
      }

      const candles = getRenderCandles();
      // FLOW G11: Используем анимированную live-свечу вместо обычной
      const animatedCandle = getAnimatedCandle();
      // Live свеча с учётом анимации и режима (HA transform для animated)
      const liveCandle = getLiveCandleForRender(animatedCandle);
      const mode = getMode();
      const digits = getDigits?.();

      // Получаем CSS размеры canvas
      // ctx уже масштабирован через DPR в useCanvasInfrastructure,
      // поэтому используем CSS размеры
      const width = canvas.clientWidth || canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.clientHeight || canvas.height / (window.devicePixelRatio || 1);

      // Проверяем, что размеры валидны
      if (width <= 0 || height <= 0) {
        rafIdRef.current = requestAnimationFrame(render);
        return;
      }

      // Очищаем весь canvas сначала
      ctx.clearRect(0, 0, width, height);

      // Загружаем настройки графика один раз для всего рендера
      const settings = getChartSettings();

      // Фоновое изображение (если установлено)
      if (settings.backgroundImage) {
        // Кэшируем изображение если URL изменился
        if (backgroundImageUrlRef.current !== settings.backgroundImage) {
          backgroundImageUrlRef.current = settings.backgroundImage;
          backgroundImageRef.current = null;
          const img = new Image();
          img.src = settings.backgroundImage;
          img.onload = () => {
            backgroundImageRef.current = img;
          };
        }
        
        // Рисуем если изображение загружено
        if (backgroundImageRef.current && backgroundImageRef.current.complete) {
          ctx.save();
          ctx.globalAlpha = settings.backgroundOpacity;
          ctx.drawImage(backgroundImageRef.current, 0, 0, width, height);
          ctx.restore();
        }
      } else {
        backgroundImageRef.current = null;
        backgroundImageUrlRef.current = null;
      }

      // FLOW C-MARKET-CLOSED: Проверяем статус рынка
      const marketStatus = getMarketStatus?.() ?? 'OPEN';
      const marketOpen = marketStatus === 'OPEN';

      // FLOW O5: фильтр по видимым оверлеям (canvas только читает registry)
      const visibleIds = getVisibleOverlayIds?.();
      const allIndicators = getIndicatorSeries();
      const indicators = visibleIds
        ? allIndicators.filter((i) => {
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
        : allIndicators;
      const hasRSI = indicators.some((i) => i.type === 'RSI') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'RSI' && c.enabled));
      const hasStochastic = indicators.some((i) => i.type === 'Stochastic') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'Stochastic' && c.enabled));
      const hasMomentum = indicators.some((i) => i.type === 'Momentum') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'Momentum' && c.enabled));
      const hasAwesomeOscillator = indicators.some((i) => i.type === 'AwesomeOscillator') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'AwesomeOscillator' && c.enabled));
      const hasMACD = indicators.some((i) => i.type === 'MACD') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'MACD' && c.enabled));
      const hasATR = indicators.some((i) => i.type === 'ATR') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'ATR' && c.enabled));
      const hasADX = indicators.some((i) => i.type === 'ADX') ||
        (visibleIds == null && indicatorConfigs.some((c) => c.type === 'ADX' && c.enabled));
      const rsiHeight = hasRSI ? 120 : 0;
      const stochHeight = hasStochastic ? 120 : 0;
      const momentumHeight = hasMomentum ? 90 : 0;
      const awesomeOscillatorHeight = hasAwesomeOscillator ? 90 : 0;
      const macdHeight = hasMACD ? 100 : 0;
      const atrHeight = hasATR ? 80 : 0;
      const adxHeight = hasADX ? 80 : 0;
      const mainHeight = height - rsiHeight - stochHeight - momentumHeight - awesomeOscillatorHeight - macdHeight - atrHeight - adxHeight; // Высота основного графика

      // FLOW C-MARKET-CLOSED: Если рынок закрыт, рисуем только grid + axes + overlay
      if (!marketOpen) {
        // Рисуем grid и axes (график остается живым)
        renderGrid({
          ctx,
          viewport,
          width,
          height: mainHeight,
          timeframeMs: getTimeframeMs(),
        });

        renderAxes({
          ctx,
          viewport,
          width,
          height: mainHeight,
          digits,
        });

        // FLOW C-MARKET-COUNTDOWN: Вычисляем countdown если есть nextMarketOpenAt
        let countdown: MarketCountdown | undefined;
        const nextMarketOpenAt = getNextMarketOpenAt?.();
        const serverTimeMs = getServerTimeMs?.();
        
        if (nextMarketOpenAt && serverTimeMs) {
          countdown = getMarketCountdown(serverTimeMs, nextMarketOpenAt);
        }

        // Рисуем overlay поверх всего с таймером
        renderMarketClosedOverlay({
          ctx,
          width,
          height: mainHeight,
          status: marketStatus,
          countdown,
        });

        // FLOW C-MARKET-ALTERNATIVES: Рисуем список альтернативных пар
        const alternatives = getTopAlternatives?.() ?? [];
        if (alternatives.length > 0 && marketAlternativesHitboxesRef) {
          const hoveredIndex = getMarketAlternativesHoveredIndex?.() ?? null;
          renderMarketAlternatives({
            ctx,
            width,
            startY: mainHeight / 2, // Список поднят выше (отступ от таймера сохраняется за счёт blockOffsetY)
            alternatives,
            hoveredIndex,
            hitboxesRef: marketAlternativesHitboxesRef,
          });
        }

        // ❗ НИЧЕГО ДАЛЬШЕ НЕ РИСУЕМ - только grid, axes, overlay и альтернативы
        // Продолжаем loop для обновления (таймер обновляется каждый кадр)
        rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));
        return;
      }

      // Вызываем render engine (только если рынок открыт)
      renderEngine({
        ctx,
        viewport,
        candles,
        liveCandle,
        width,
        height: mainHeight,
        timeframeMs: getTimeframeMs(),
        mode,
        digits,
      });

      // FLOW E: Expiration overlay — вертикальная пунктирная линия по server time с плавным смещением
      // Используем ту же логику что и на линейном графике (где все работает нормально)
      const rawExpirationTimestamp = getExpirationTime?.();
      if (rawExpirationTimestamp != null && Number.isFinite(rawExpirationTimestamp) && viewport.timeEnd > viewport.timeStart) {
        const EXP_ANIM_DURATION_MS = 320;
        const PRICE_LABEL_AREA_WIDTH = 60; // Ширина области меток цены
        const TIME_LABEL_HEIGHT = 25; // Высота области меток времени
        
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

        // Простая проверка видимости как на линейном графике
        const expirationX = ((expirationRenderTimeRef.current - viewport.timeStart) / (viewport.timeEnd - viewport.timeStart)) * width;
        const maxX = width - PRICE_LABEL_AREA_WIDTH;
        
        // Рисуем только если видно (как на линейном графике)
        if (expirationX >= 0 && expirationX <= maxX) {
          ctx.save();
          
          const CIRCLE_RADIUS = 18; // Еще больше увеличен радиус кружка
          const isMobile = width < 600; // На мобилке — ниже (под контролами графика)
          const CIRCLE_Y = isMobile ? 78 : 30;

          // Рисуем кружок на линии экспирации сверху
          const circleX = expirationX;
          const circleY = CIRCLE_Y;
          
          // Фон кружка (синий как у кроссхейра)
          ctx.fillStyle = '#40648f';
          ctx.beginPath();
          ctx.arc(circleX, circleY, CIRCLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          
          // Обводка кружка
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Рисуем финишный флажок (checkered flag) на кружке — 4x3 клетки, яркие цвета
          const cols = 5;
          const rows = 3;
          const flagWidth = CIRCLE_RADIUS * 1.1;
          const flagHeight = CIRCLE_RADIUS * 0.78;
          const flagX = circleX;
          const flagY = circleY;
          const cellWidth = flagWidth / cols;
          const cellHeight = flagHeight / rows;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 0.5;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const cellX = flagX - flagWidth / 2 + col * cellWidth;
              const cellY = flagY - flagHeight / 2 + row * cellHeight;
              ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)';
              ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
              ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
            }
          }

          // Рисуем линию экспирации - начинается от кружка и идет вниз
          ctx.strokeStyle = 'rgba(64, 100, 143, 0.5)'; // Цвет как у кроссхейра (LINE_COLOR)
          ctx.lineWidth = 2; // Увеличена толщина линии
          ctx.setLineDash([]);
          ctx.beginPath();
          // Линия начинается от низа кружка
          ctx.moveTo(expirationX, circleY + CIRCLE_RADIUS);
          // Ограничиваем высоту линии, чтобы не перекрывать метки времени внизу
          ctx.lineTo(expirationX, mainHeight - TIME_LABEL_HEIGHT);
          ctx.stroke();

          ctx.restore();
        }
      } else {
        // Нет валидного expiration — очищаем анимационное состояние
        expirationRenderTimeRef.current = null;
        expirationTargetTimeRef.current = null;
        expirationAnimStartTimeRef.current = null;
        expirationAnimStartValueRef.current = null;
      }

      // FLOW BO-HOVER: Рисуем подсветку зоны при наведении на кнопки CALL/PUT
      const hoverAction = getHoverAction?.();
      if (hoverAction) {
        const liveCandle = getLiveCandleForRender(animatedCandle);
        const currentPrice = liveCandle?.close;
        if (currentPrice != null && liveCandle) {
          // Конвертируем цену в Y координату
          const priceRange = viewport.priceMax - viewport.priceMin;
          if (priceRange > 0) {
            const normalizedPrice = (currentPrice - viewport.priceMin) / priceRange;
            const priceY = mainHeight - (normalizedPrice * mainHeight);
            
            // FLOW BO-HOVER-ARROWS: Вычисляем X координату последней свечи (центр свечи)
            const timeframeMs = getTimeframeMs();
            const candleCenterTime = liveCandle.startTime + timeframeMs / 2;
            const timeRange = viewport.timeEnd - viewport.timeStart;
            const lastDataPointX = timeRange > 0
              ? ((candleCenterTime - viewport.timeStart) / timeRange) * width
              : null;
            
            renderHoverHighlight({
              ctx,
              hoverAction,
              priceY,
              width,
              height: mainHeight,
              arrowUpImg: getArrowUpImg?.(),
              arrowDownImg: getArrowDownImg?.(),
              lastDataPointX,
            });
          }
        }
      }

      // FLOW A4: Рисуем линии ценовых алертов (только в основной зоне)
      const alerts = getPriceAlerts();
      if (alerts.length > 0) {
        renderPriceAlerts({
          ctx,
          viewport,
          width,
          height: mainHeight,
          alerts,
        });
      }

      // FLOW G12: Рисуем индикаторы (если есть включенные)
      if (indicators.length > 0) {
        renderIndicators({
          ctx,
          indicators,
          indicatorConfigs,
          viewport,
          width,
          height: mainHeight, // Основная высота для SMA/EMA
          rsiHeight, // Высота зоны RSI
          stochHeight, // Высота зоны Stochastic
          momentumHeight, // Высота зоны Momentum (гистограмма)
          awesomeOscillatorHeight, // Высота зоны Awesome Oscillator (гистограмма)
          macdHeight, // Высота зоны MACD (линия + сигнал + гистограмма)
          atrHeight, // Высота зоны ATR (волатильность)
          adxHeight, // Высота зоны ADX (+DI/-DI/ADX)
        });
      }

      // FLOW G7: Рисуем crosshair поверх индикаторов (только в основной зоне)
      const crosshair = getCrosshair();
      renderCrosshair({
        ctx,
        crosshair,
        width,
        height: mainHeight,
        registerInteractionZone,
        digits,
      });

      // FLOW T-OVERLAY: Рисуем trades (сделки) - только видимые
      if (getTrades) {
        const allTrades = getTrades();
        
        const visibleTradeIds = visibleIds || new Set<string>();
        const trades = visibleIds
          ? allTrades.filter((t) => visibleTradeIds.has(t.id))
          : allTrades;
        
        // Получаем текущую цену из liveCandle для расчета прибыли
        const liveCandle = getLiveCandleForRender(animatedCandle);
        const currentPrice = liveCandle?.close;
        
        if (trades.length > 0) {
          // Получаем свечи и timeframe для вычисления центра свечи
          const candles = getRenderCandles();
          const timeframeMs = getTimeframeMs();
          
          renderTrades({
            ctx,
            trades,
            viewport,
            width,
            height: mainHeight,
            digits,
            currentPrice,
            candles,
            liveCandle,
            timeframeMs,
            payoutPercent: getPayoutPercent?.() ?? 75,
          });
        }
      }

      // FLOW O5: drawings только с visible overlay
      const allDrawings = getDrawings();
      const drawings = visibleIds
        ? allDrawings.filter((d) => visibleIds.has(d.id))
        : allDrawings;
      renderDrawings({
        ctx,
        drawings,
        viewport,
        width,
        height: mainHeight, // Drawings только в основной зоне
        hoveredDrawingId: getHoveredDrawingId(),
        selectedDrawingId: getSelectedDrawingId(),
      });

      // FLOW G8: Обновляем OHLC данные (синхронизировано с кадрами)
      updateOhlc();

      // FLOW G8: Рисуем OHLC панель
      const ohlc = getOhlc();
      renderOhlcPanel({
        ctx,
        ohlc,
        width,
        height,
        digits,
      });


      // FLOW T6/T7: серверное время — overlay сверху слева, под селектором, поверх всего, не скроллится
      const timeText = getServerTimeText?.();
      if (timeText) {
        ctx.save();
        ctx.font = '12px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        // На мобилке — выше (как на ПК), т.к. pt-10 сдвигает контент вниз
        const timeY = width < 768 ? 20 : 60;
        ctx.fillText(timeText, 18, timeY);
        ctx.restore();
      }

      // FLOW C4-C5: Рисуем countdown timer справа от лайв-свечи
      if (liveCandle && getTimeframeLabel && getFormattedCountdown && settings.showCountdown) {
        // Вычисляем ширину свечи (та же логика что в renderCandles)
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const CANDLE_GAP = 0.5;
        const MAX_CANDLE_PX = 200;
        const rawWidth = timeRange > 0 ? (getTimeframeMs() / timeRange) * width : 0;
        const distanceBetweenCenters = rawWidth;
        const effectiveMaxWidth = Math.max(0, distanceBetweenCenters - CANDLE_GAP);
        const candleWidth = Math.min(MAX_CANDLE_PX, effectiveMaxWidth);

        renderCountdown({
          ctx,
          viewport,
          liveCandle,
          width,
          height: mainHeight,
          timeframeMs: getTimeframeMs(),
          timeframeLabel: getTimeframeLabel(),
          remainingTime: getFormattedCountdown(),
          candleWidth,
        });
      }

      // Метка времени кроссхейра — внизу основной зоны
      if (crosshair?.isActive) {
        renderCrosshairTimeLabel(ctx, crosshair, width, mainHeight);
      }

      // Продолжаем loop
      rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));
    };

    // Запускаем render loop
    rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));

    // Cleanup
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [canvasRef, getViewport, getRenderCandles, getRenderLiveCandle, getAnimatedCandle, getLiveCandleForRender, updateAnimator, getFollowMode, advanceFollowAnimation, advanceYAnimation, getTimeframeMs, getCrosshair, getOhlc, updateOhlc, getMode, getIndicatorSeries, indicatorConfigs, getDrawings, getHoveredDrawingId, getSelectedDrawingId, getVisibleOverlayIds, getServerTimeText, getServerTimeMs, getDigits, getTrades, getPayoutPercent, getTimeframeLabel, getFormattedCountdown, getMarketStatus, getNextMarketOpenAt, getTopAlternatives, marketAlternativesHitboxesRef, getMarketAlternativesHoveredIndex, registerInteractionZone, clearInteractionZones]);
}
