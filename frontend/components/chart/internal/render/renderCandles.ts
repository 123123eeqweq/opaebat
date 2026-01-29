/**
 * renderCandles.ts - отрисовка свечей
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import type { CandleMode } from '../candleModes/candleMode.types';

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

const CANDLE_BODY_WIDTH_RATIO = 0.7; // Ширина тела свечи относительно ширины свечи
const WICK_WIDTH = 1;
const GREEN_COLOR = '#10b981'; // green-500
const RED_COLOR = '#ef4444'; // red-500

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
  isLive: boolean
): void {
  // Позиция X берется от startTime свечи
  const startX = timeToX(candle.startTime, viewport, width);
  const centerX = startX + candleWidth / 2; // Центр свечи для фитиля

  const openY = priceToY(candle.open, viewport, height);
  const closeY = priceToY(candle.close, viewport, height);
  const highY = priceToY(candle.high, viewport, height);
  const lowY = priceToY(candle.low, viewport, height);

  const isGreen = candle.close >= candle.open;
  const color = isGreen ? GREEN_COLOR : RED_COLOR;
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyHeight = Math.abs(closeY - openY) || 1; // Минимум 1px для видимости
  const bodyWidth = candleWidth * CANDLE_BODY_WIDTH_RATIO;

  ctx.save();

  // Рисуем фитиль (wick) - по центру свечи
  ctx.strokeStyle = color;
  ctx.lineWidth = WICK_WIDTH;
  ctx.beginPath();
  ctx.moveTo(centerX, highY);
  ctx.lineTo(centerX, lowY);
  ctx.stroke();

  // Рисуем тело свечи - выровнено по startX
  ctx.fillStyle = color;
  ctx.fillRect(centerX - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

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
  isLive: boolean
): void {
  // Позиция X берется от startTime свечи
  const startX = timeToX(candle.startTime, viewport, width);
  const centerX = startX + candleWidth / 2; // Центр свечи

  const openY = priceToY(candle.open, viewport, height);
  const closeY = priceToY(candle.close, viewport, height);
  const highY = priceToY(candle.high, viewport, height);
  const lowY = priceToY(candle.low, viewport, height);

  const isGreen = candle.close >= candle.open;
  const color = isGreen ? GREEN_COLOR : RED_COLOR;

  ctx.save();

  // Вертикальная линия от low до high
  ctx.strokeStyle = color;
  ctx.lineWidth = WICK_WIDTH;
  ctx.beginPath();
  ctx.moveTo(centerX, highY);
  ctx.lineTo(centerX, lowY);
  ctx.stroke();

  // Горизонтальная черта слева = open
  const tickWidth = candleWidth * 0.2; // Ширина горизонтальных черточек
  ctx.beginPath();
  ctx.moveTo(centerX - tickWidth / 2, openY);
  ctx.lineTo(centerX, openY);
  ctx.stroke();

  // Горизонтальная черта справа = close
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
  isLive: boolean,
  mode: CandleMode
): void {
  if (mode === 'bars') {
    renderCandleBars(ctx, candle, viewport, width, height, candleWidth, isLive);
  } else {
    // classic или heikin_ashi - одинаковый способ отрисовки
    renderCandleClassic(ctx, candle, viewport, width, height, candleWidth, isLive);
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
  const candleWidth = timeRange > 0 ? (timeframeMs / timeRange) * width : 0;

  // Рисуем закрытые свечи
  for (const candle of candles) {
    if (isCandleVisible(candle, viewport)) {
      renderCandle(ctx, candle, viewport, width, height, candleWidth, false, mode);
    }
  }

  // Рисуем live-свечу
  if (liveCandle && isCandleVisible(liveCandle, viewport)) {
    renderCandle(ctx, liveCandle, viewport, width, height, candleWidth, true, mode);
  }
}
