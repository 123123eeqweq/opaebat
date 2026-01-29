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
import { renderEngine } from './render/renderEngine';
import { renderCrosshair, renderCrosshairTimeLabel } from './crosshair/renderCrosshair';
import { renderOhlcPanel } from './ohlc/renderOhlcPanel';
import { renderIndicators } from './indicators/renderIndicators';
import { renderDrawings } from './drawings/renderDrawings';
import { renderPriceAlerts } from './alerts/renderPriceAlerts';
import { renderTrades } from './trades/renderTrades';
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
  updateAnimator: (now: number) => void; // FLOW G11: Обновление аниматора
  getFollowMode: () => boolean; // FLOW F1: follow mode — для плавного сдвига viewport
  advanceFollowAnimation: (now: number) => void; // FLOW F1: плавный сдвиг при follow
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
  /** FLOW C-TIMER: получение серверного времени в миллисекундах */
  getServerTimeMs?: () => number;
  /** Количество знаков после запятой для цен (по инструменту, напр. 5 для forex) */
  getDigits?: () => number | undefined;
  // FLOW A: Price Alerts
  getPriceAlerts: () => PriceAlert[];
  registerInteractionZone: (zone: InteractionZone) => void;
  clearInteractionZones: () => void;
  /** FLOW E: время экспирации в мс от эпохи (server time anchor) */
  getExpirationTime?: () => number | null;
  /** FLOW T-OVERLAY: получить все активные сделки */
  getTrades?: () => Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
  }>;
}

export function useRenderLoop({
  canvasRef,
  getViewport,
  getRenderCandles,
  getRenderLiveCandle,
  getAnimatedCandle,
  updateAnimator,
  getFollowMode,
  advanceFollowAnimation,
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
  getTrades,
}: UseRenderLoopParams): void {
  const rafIdRef = useRef<number | null>(null);
  // FLOW E: плавная анимация вертикальной линии экспирации при смене expirationSeconds
  const expirationRenderTimeRef = useRef<number | null>(null);
  const expirationTargetTimeRef = useRef<number | null>(null);
  const expirationAnimStartTimeRef = useRef<number | null>(null);
  const expirationAnimStartValueRef = useRef<number | null>(null);

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
      // FLOW F1: Плавный сдвиг viewport в follow mode
      if (getFollowMode()) {
        advanceFollowAnimation(now);
      }

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
      // Fallback на обычную live-свечу, если анимации нет
      const liveCandle = animatedCandle || getRenderLiveCandle();
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

      // FLOW O5: фильтр по видимым оверлеям (canvas только читает registry)
      const visibleIds = getVisibleOverlayIds?.();
      const allIndicators = getIndicatorSeries();
      const indicators = visibleIds
        ? allIndicators.filter((i) => {
            if (i.type === 'Stochastic') {
              const baseId = i.id.replace(/_k$|_d$/, '');
              return visibleIds.has(baseId);
            }
            if (i.type === 'BollingerBands') {
              const baseId = i.id.replace(/_upper$|_middle$|_lower$/, '');
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
      const rsiHeight = hasRSI ? 120 : 0;
      const stochHeight = hasStochastic ? 120 : 0;
      const momentumHeight = hasMomentum ? 90 : 0;
      const mainHeight = height - rsiHeight - stochHeight - momentumHeight; // Высота основного графика

      // Вызываем render engine
      // renderEngine НЕ очищает canvas (мы уже очистили выше)
      renderEngine({
        ctx,
        viewport,
        candles,
        liveCandle,
        width,
        height: mainHeight, // Используем скорректированную высоту
        timeframeMs: getTimeframeMs(),
        mode,
        digits,
      });

      // FLOW E: Expiration overlay — вертикальная пунктирная линия по server time с плавным смещением
      const rawExpirationTimestamp = getExpirationTime?.();
      if (rawExpirationTimestamp != null && Number.isFinite(rawExpirationTimestamp) && viewport.timeEnd > viewport.timeStart) {
        const EXP_ANIM_DURATION_MS = 320;
        const currentTarget = expirationTargetTimeRef.current;
        const currentRender = expirationRenderTimeRef.current;

        // Если первый раз или раньше линии не было — просто ставим без анимации
        if (currentRender == null || currentTarget == null) {
          expirationRenderTimeRef.current = rawExpirationTimestamp;
          expirationTargetTimeRef.current = rawExpirationTimestamp;
          expirationAnimStartTimeRef.current = null;
          expirationAnimStartValueRef.current = null;
        } else {
          const delta = Math.abs(rawExpirationTimestamp - currentTarget);
          // Маленькие изменения (server:time тикает каждую секунду) не анимируем специально —
          // они и так дают плавное движение линии. Анимацию включаем только при "прыжках"
          // от смены expirationSeconds (разница больше ~1.5 секунды).
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
            const t = progress ** 3 * (progress * (6 * progress - 15) + 10); // easeInOutSmooth
            const animated = animStartValue + (target - animStartValue) * t;
            expirationRenderTimeRef.current = animated;

            if (progress >= 1) {
              expirationRenderTimeRef.current = target;
              expirationAnimStartTimeRef.current = null;
              expirationAnimStartValueRef.current = null;
            }
          } else {
            // Нет активной анимации — просто следуем за целевым временем
            expirationRenderTimeRef.current = target;
          }
        }

        const effectiveTimestamp = expirationRenderTimeRef.current ?? rawExpirationTimestamp;

        const timeToX = (time: number): number =>
          ((time - viewport.timeStart) / (viewport.timeEnd - viewport.timeStart)) * width;

        const x = timeToX(effectiveTimestamp);

        ctx.save();
        // Стиль как у линии текущей цены: синяя, сплошная, ширина 1
        ctx.strokeStyle = '#3347ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, mainHeight);
        ctx.stroke();
        ctx.restore();
      } else {
        // Нет валидного expiration — очищаем анимационное состояние
        expirationRenderTimeRef.current = null;
        expirationTargetTimeRef.current = null;
        expirationAnimStartTimeRef.current = null;
        expirationAnimStartValueRef.current = null;
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
        });
      }

      // FLOW G7: Рисуем crosshair поверх всего (только в основной зоне, не в RSI)
      const crosshair = getCrosshair();
      renderCrosshair({
        ctx,
        crosshair,
        width,
        height: mainHeight, // Crosshair только в основной зоне
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
        renderTrades({
          ctx,
          trades,
          viewport,
          width,
          height: mainHeight,
          digits,
        });
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

      // FLOW T6/T7: серверное время — overlay сверху слева, поверх всего, не скроллится
      const timeText = getServerTimeText?.();
      if (timeText) {
        ctx.save();
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#9aa0a6';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(timeText, 8, 8);
        ctx.restore();
      }

      // Метка времени кроссхейра — рисуем последней, чтобы её никто не перекрывал
      const crosshairForTime = getCrosshair();
      if (crosshairForTime?.isActive) {
        renderCrosshairTimeLabel(ctx, crosshairForTime, width, mainHeight);
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
  }, [canvasRef, getViewport, getRenderCandles, getRenderLiveCandle, getAnimatedCandle, updateAnimator, getFollowMode, advanceFollowAnimation, getTimeframeMs, getCrosshair, getOhlc, updateOhlc, getMode, getIndicatorSeries, indicatorConfigs, getDrawings, getHoveredDrawingId, getSelectedDrawingId, getVisibleOverlayIds, getServerTimeText, getServerTimeMs, getDigits, getTrades]);
}
