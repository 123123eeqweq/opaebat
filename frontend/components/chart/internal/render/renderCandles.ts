/**
 * renderCandles.ts - отрисовка свечей
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import type { CandleMode } from '../candleModes/candleMode.types';
import { getChartSettings } from '@/lib/chartSettings';

interface RenderCandlesParams {
  ctx: CanvasRenderingContext2D; // Нативный тип браузера
  viewport: Viewport;
  candles: Candle[];
  liveCandle: Candle | null;
  width: number;
  height: number;
  timeframeMs: number; // Добавляем timeframeMs для правильного расчета ширины
  mode?: CandleMode; // FLOW G10: Режим отображения свечей
}

const WICK_WIDTH = 1;
// Цвета загружаются из настроек динамически

// 🔥 FLOW: Candle Width Control - ограничения ширины свечи
const MAX_CANDLE_PX = 200; // Максимальная ширина свечи в пикселях (для zoom in)
const MIN_GAP_PX = 2; // Минимальный зазор между свечами в пикселях (при любом зуме)
const MAX_GAP_PX = 6; // Максимальный зазор между свечами (для очень больших свечей)

/**
 * Вычисляет адаптивный коэффициент ширины тела свечи
 * При маленьких свечах: больше gap (пропорционально)
 * При больших свечах: минимальный фиксированный gap (2-6px)
 */
function getBodyWidthRatio(candleWidth: number): number {
  if (candleWidth <= 0) return 0.7;
  
  // Для маленьких свечей (<15px): пропорциональный gap ~30%
  if (candleWidth < 15) {
    return 0.7;
  }
  
  // Для средних и больших свечей: фиксированный gap 2-6px
  // Интерполируем gap от MIN_GAP_PX до MAX_GAP_PX
  const targetGap = Math.min(MAX_GAP_PX, Math.max(MIN_GAP_PX, candleWidth * 0.04));
  const ratio = (candleWidth - targetGap) / candleWidth;
  
  // Ограничиваем ratio: минимум 0.7, максимум 0.96
  return Math.max(0.7, Math.min(0.96, ratio));
}

/**
 * Проверяет, видна ли свеча в viewport
 */
function isCandleVisible(candle: Candle, viewport: Viewport): boolean {
  return (
    (candle.startTime >= viewport.timeStart && candle.startTime <= viewport.timeEnd) ||
    (candle.endTime >= viewport.timeStart && candle.endTime <= viewport.timeEnd) ||
    (candle.startTime <= viewport.timeStart && candle.endTime >= viewport.timeEnd)
  );
}

/**
 * Конвертирует время в X координату
 */
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

/**
 * Рисует одну свечу в режиме classic или heikin_ashi
 */
function renderCandleClassic(
  ctx: CanvasRenderingContext2D, // Нативный тип браузера
  candle: Candle,
  viewport: Viewport,
  width: number,
  height: number,
  candleWidth: number,
  timeframeMs: number
): void {
  // 🔥 FLOW: Candle Width Control - центрирование по времени
  // Центр свечи вычисляется по времени (середина временного слота свечи)
  // Это гарантирует правильное позиционирование даже при ограниченной ширине
  const candleCenterTime = candle.startTime + timeframeMs / 2;
  const centerX = timeToX(candleCenterTime, viewport, width);

  const openY = priceToY(candle.open, viewport, height);
  const closeY = priceToY(candle.close, viewport, height);
  const highY = priceToY(candle.high, viewport, height);
  const lowY = priceToY(candle.low, viewport, height);

  const isGreen = candle.close >= candle.open;
  const settings = getChartSettings();
  const color = isGreen ? settings.bullishColor : settings.bearishColor;
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyHeight = Math.abs(closeY - openY) || 1; // Минимум 1px для видимости
  
  ctx.save();

  // Рисуем фитиль (wick) - по центру свечи
  // При очень маленькой ширине свечи делаем фитиль тоньше для визуальной точности
  // Фитиль всегда рисуется, даже если тело не помещается
  const wickWidth = candleWidth <= 2 ? Math.max(0.5, candleWidth / 2) : WICK_WIDTH;
  ctx.strokeStyle = color;
  ctx.lineWidth = wickWidth;
  ctx.beginPath();
  ctx.moveTo(centerX, highY);
  ctx.lineTo(centerX, lowY);
  ctx.stroke();

  // Рисуем тело свечи - центрировано относительно centerX
  // Тело рисуется только если есть достаточно места (>= 0.5px для видимости)
  if (candleWidth > 0.5) {
    // 🔥 Адаптивный ratio: при большом зуме gap минимальный (2-6px)
    const bodyWidthRatio = getBodyWidthRatio(candleWidth);
    const bodyWidth = Math.max(0.5, candleWidth * bodyWidthRatio);
    ctx.fillStyle = color;
    ctx.fillRect(centerX - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
  }

  ctx.restore();
}

/**
 * Рисует одну свечу в режиме bars (OHLC bars)
 * 
 * Правила:
 * - Вертикальная линия = low → high
 * - Горизонтальная черта слева = open
 * - Горизонтальная черта справа = close
 * - Body НЕ рисуется
 */
function renderCandleBars(
  ctx: CanvasRenderingContext2D, // Нативный тип браузера
  candle: Candle,
  viewport: Viewport,
  width: number,
  height: number,
  candleWidth: number,
  timeframeMs: number
): void {
  // 🔥 FLOW: Candle Width Control - центрирование по времени
  // Центр свечи вычисляется по времени (середина временного слота свечи)
  const candleCenterTime = candle.startTime + timeframeMs / 2;
  const centerX = timeToX(candleCenterTime, viewport, width);

  const openY = priceToY(candle.open, viewport, height);
  const closeY = priceToY(candle.close, viewport, height);
  const highY = priceToY(candle.high, viewport, height);
  const lowY = priceToY(candle.low, viewport, height);

  const isGreen = candle.close >= candle.open;
  const settings = getChartSettings();
  const color = isGreen ? settings.bullishColor : settings.bearishColor;

  ctx.save();

  // Вертикальная линия от low до high — делаем толще для лучшей видимости
  const barLineWidth = Math.min(4, Math.max(2, candleWidth * 0.4));
  ctx.strokeStyle = color;
  ctx.lineWidth = barLineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, highY);
  ctx.lineTo(centerX, lowY);
  ctx.stroke();

  // Горизонтальная черта слева = open
  const tickWidth = Math.max(4, candleWidth * 0.35); // Шире для читаемости
  ctx.beginPath();
  ctx.moveTo(centerX - tickWidth / 2, openY);
  ctx.lineTo(centerX, openY);
  ctx.stroke();

  // Горизонтальная черта справа = close
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX, closeY);
  ctx.lineTo(centerX + tickWidth / 2, closeY);
  ctx.stroke();

  ctx.restore();
}

/**
 * Рисует одну свечу (выбирает режим автоматически)
 */
function renderCandle(
  ctx: CanvasRenderingContext2D,
  candle: Candle,
  viewport: Viewport,
  width: number,
  height: number,
  candleWidth: number,
  timeframeMs: number,
  isLive: boolean,
  mode: CandleMode
): void {
  if (mode === 'bars') {
    renderCandleBars(ctx, candle, viewport, width, height, candleWidth, timeframeMs);
  } else {
    // classic или heikin_ashi - одинаковый способ отрисовки
    renderCandleClassic(ctx, candle, viewport, width, height, candleWidth, timeframeMs);
  }
}

export function renderCandles({
  ctx,
  viewport,
  candles,
  liveCandle,
  width,
  height,
  timeframeMs,
  mode = 'classic', // FLOW G10: Режим отображения (по умолчанию classic)
}: RenderCandlesParams): void {
  // Вычисляем ширину свечи на основе timeframe (не на основе количества видимых свечей!)
  // Каждая свеча занимает фиксированное пространство времени
  const timeRange = viewport.timeEnd - viewport.timeStart;
  
  // Ширина одной свечи в пикселях = (timeframeMs / timeRange) * width
  // Это гарантирует равномерное распределение, даже если есть пропуски в данных
  const rawWidth = timeRange > 0 ? (timeframeMs / timeRange) * width : 0;
  
  // 🔥 АРХИТЕКТУРНО ПРАВИЛЬНОЕ РЕШЕНИЕ: ширина = всё пространство временного слота
  // Gap между телами свечей контролируется через bodyWidthRatio в renderCandleClassic
  // Это позволяет:
  // - При маленьком зуме: пропорциональный gap (~30%)
  // - При большом зуме: минимальный фиксированный gap (2-6px)
  const candleWidth = Math.min(MAX_CANDLE_PX, rawWidth);

  // Рисуем закрытые свечи
  for (const candle of candles) {
    if (isCandleVisible(candle, viewport)) {
      renderCandle(ctx, candle, viewport, width, height, candleWidth, timeframeMs, false, mode);
    }
  }

  // Рисуем live-свечу
  if (liveCandle && isCandleVisible(liveCandle, viewport)) {
    renderCandle(ctx, liveCandle, viewport, width, height, candleWidth, timeframeMs, true, mode);
  }
}
