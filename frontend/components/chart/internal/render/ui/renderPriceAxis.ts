/**
 * FLOW L-UI-2: Render Price Axis - метки цены справа
 * 
 * Используется для линейного графика.
 * Оси — это UI, не часть графика.
 */

import type { TimePriceViewport } from './viewport.types';

interface RenderPriceAxisParams {
  ctx: CanvasRenderingContext2D;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту) */
  digits?: number;
}

const LABEL_COLOR = 'rgba(255, 255, 255, 0.45)';
const LABEL_FONT = '12px sans-serif';
const LABEL_PADDING_RIGHT = 4;

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, viewport: TimePriceViewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  
  const normalizedPrice = (price - viewport.priceMin) / priceRange;
  return height - (normalizedPrice * height);
}

/**
 * Форматирует цену
 */
function formatPrice(price: number, digits?: number): string {
  if (digits != null) return price.toFixed(digits);
  const decimals = price >= 1000 ? 0 : price >= 100 ? 1 : price >= 10 ? 2 : 3;
  return price.toFixed(decimals);
}


export function renderPriceAxis({
  ctx,
  viewport,
  width,
  height,
  digits,
}: RenderPriceAxisParams): void {
  const { priceMin, priceMax } = viewport;
  const priceRange = priceMax - priceMin;

  if (priceRange <= 0) return;

  ctx.save();

  // Настройки текста
  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // 🔥 FLOW I-PAYOUT FIX: Используем тот же алгоритм расчета шагов что и в renderGrid
  // чтобы метки совпадали с линиями сетки
  const targetSteps = 10; // Целевое количество шагов (как в renderGrid)
  const pixelsPerStep = height / targetSteps;
  const pricePerPixel = priceRange / height;
  const priceStepRaw = pixelsPerStep * pricePerPixel;

  // Округляем до "красивых" значений (как в renderGrid)
  const magnitude = Math.pow(10, Math.floor(Math.log10(priceStepRaw)));
  const normalized = priceStepRaw / magnitude;

  let priceStep: number;
  if (normalized <= 1) priceStep = 1;
  else if (normalized <= 2) priceStep = 2;
  else if (normalized <= 5) priceStep = 5;
  else priceStep = 10;

  priceStep = priceStep * magnitude;
  const startPrice = Math.ceil(priceMin / priceStep) * priceStep;

  // Рисуем метки цены (БЕЗ горизонтальных линий - они уже нарисованы в renderGrid)
  for (let price = startPrice; price <= priceMax; price += priceStep) {
    const y = priceToY(price, viewport, height);

    // Проверяем, что метка видна
    if (y < 0 || y > height) continue;

    // Только текст метки справа (без линии - линия уже в renderGrid)
    const priceText = formatPrice(price, digits);
    ctx.fillText(priceText, width - LABEL_PADDING_RIGHT, y);
  }

  ctx.restore();
}
