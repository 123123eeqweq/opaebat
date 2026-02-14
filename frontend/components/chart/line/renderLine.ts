/**
 * FLOW LINE-4: Rendering линейного графика на Canvas
 * 
 * Ответственность:
 * - Отрисовка линии из тиков
 * - Преобразование (time, price) → (x, y)
 * - Фильтрация тиков по viewport
 * - FLOW L-UI-2: Area fill под линией с градиентом
 */

import type { PricePoint } from './useLinePointStore';
import type { LineViewport } from './lineTypes';

interface RenderLineParams {
  ctx: CanvasRenderingContext2D;
  ticks: PricePoint[];
  viewport: LineViewport;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  color?: string;
  lineWidth?: number;
  /** FLOW L-UI-2: Рендерить ли area fill под линией */
  renderAreaFill?: boolean;
  /** Live точка — добавляется в конец для area fill (градиент включает live) */
  livePoint?: { time: number; price: number } | null;
}

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, priceMin: number, priceMax: number, height: number): number {
  const priceRange = priceMax - priceMin;
  if (priceRange === 0) return height / 2;
  
  const normalizedPrice = (price - priceMin) / priceRange;
  return height - (normalizedPrice * height);
}

/**
 * Рендерит area fill под линией с градиентом
 * FLOW L-UI-2: Градиент идет от самой верхней точки линии до низа viewport
 */
function renderAreaFill(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number
): void {
  if (points.length === 0) return;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  // 🔥 FIX #17: Не используем Math.min(...arr) — при большом массиве превысим лимит аргументов
  let minY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < minY) minY = points[i].y;
  }
  const topY = Math.max(0, Math.min(minY, height));

  // Создаем градиент (от верхней точки линии до низа viewport)
  const gradient = ctx.createLinearGradient(0, topY, 0, height);
  gradient.addColorStop(0, 'rgba(59,130,246,0.35)');
  gradient.addColorStop(1, 'rgba(59,130,246,0.02)');

  // Строим path: линия → вниз → закрываем
  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.lineTo(lastPoint.x, height);
  ctx.lineTo(firstPoint.x, height);
  ctx.closePath();

  ctx.fillStyle = gradient;
  ctx.fill();
}

/**
 * Рендерит линейный график из тиков
 */
export function renderLine({
  ctx,
  ticks,
  viewport,
  width,
  height,
  priceMin,
  priceMax,
  color = '#4da3ff',
  lineWidth = 1.3,
  renderAreaFill: shouldRenderAreaFill = false,
  livePoint = null,
}: RenderLineParams): void {
  if (ticks.length === 0) return;

  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;

  if (timeRange <= 0) return;

  // Фильтруем тики по временному окну
  const visibleTicks = ticks.filter(
    (tick) => tick.time >= timeStart && tick.time <= timeEnd
  );

  if (visibleTicks.length === 0) {
    return;
  }

  // Сортируем по времени
  visibleTicks.sort((a, b) => a.time - b.time);

  ctx.save();

  // Вычисляем точки для линии
  const points: Array<{ x: number; y: number }> = [];
  for (const tick of visibleTicks) {
    const x = ((tick.time - timeStart) / timeRange) * width;
    const y = priceToY(tick.price, priceMin, priceMax, height);
    points.push({ x, y });
  }

  // Точки для area fill — включают live точку если есть
  const areaPoints = [...points];
  if (livePoint && livePoint.time >= timeStart && livePoint.time <= timeEnd) {
    const liveX = ((livePoint.time - timeStart) / timeRange) * width;
    const liveY = priceToY(livePoint.price, priceMin, priceMax, height);
    areaPoints.push({ x: liveX, y: liveY });
  }

  // FLOW L-UI-2: Рендерим area fill ПЕРЕД линией (включая live точку)
  if (shouldRenderAreaFill && areaPoints.length > 0) {
    renderAreaFill(ctx, areaPoints, width, height);
  }

  // Рисуем линию поверх area fill
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Вычисляет min/max цену из тиков в viewport
 * ✅ Учитывает live сегмент: fromPrice + toPrice (анимированная цена из аниматора)
 */
export function calculatePriceRange(
  ticks: PricePoint[],
  viewport: LineViewport,
  liveSegment?: { fromPrice: number } | null,
  toPrice?: number
): { min: number; max: number } {
  const visibleTicks = ticks.filter(
    (tick) => tick.time >= viewport.timeStart && tick.time <= viewport.timeEnd
  );

  const prices: number[] = visibleTicks.map((tick) => tick.price);

  if (liveSegment) {
    prices.push(liveSegment.fromPrice);
    if (toPrice !== undefined && Number.isFinite(toPrice)) {
      prices.push(toPrice);
    }
  }

  if (prices.length === 0) {
    return { min: 0, max: 1 };
  }

  let min = prices[0];
  let max = prices[0];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] < min) min = prices[i];
    if (prices[i] > max) max = prices[i];
  }

  // Добавляем небольшой отступ для визуализации
  const padding = (max - min) * 0.1 || 1;
  return {
    min: min - padding,
    max: max + padding,
  };
}

/**
 * Рендерит live сегмент — линия от (fromTime, fromPrice) к (toTime, toPrice).
 * X и Y плавно интерполируются в render loop.
 */
export function renderLiveSegment({
  ctx,
  fromTime,
  toTime,
  fromPrice,
  toPrice,
  viewport,
  width,
  height,
  priceMin,
  priceMax,
  color = '#4da3ff',
  lineWidth = 2,
  renderAreaFill: shouldRenderAreaFill = false,
}: {
  ctx: CanvasRenderingContext2D;
  fromTime: number;
  toTime: number;
  fromPrice: number;
  toPrice: number;
  viewport: LineViewport;
  width: number;
  height: number;
  priceMin: number;
  priceMax: number;
  color?: string;
  lineWidth?: number;
  renderAreaFill?: boolean;
}): void {
  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;
  if (timeRange <= 0) return;

  ctx.save();

  const fromX = ((fromTime - timeStart) / timeRange) * width;
  const toX = ((toTime - timeStart) / timeRange) * width;
  const fromY = priceToY(fromPrice, priceMin, priceMax, height);
  const toY = priceToY(toPrice, priceMin, priceMax, height);

  // Area fill для live segment (градиент под линией)
  if (shouldRenderAreaFill) {
    const minY = Math.min(fromY, toY);
    const topY = Math.max(0, Math.min(minY, height));
    
    const gradient = ctx.createLinearGradient(0, topY, 0, height);
    gradient.addColorStop(0, 'rgba(59,130,246,0.35)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.02)');
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX, height);
    ctx.lineTo(fromX, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Линия поверх area fill
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.restore();
}
