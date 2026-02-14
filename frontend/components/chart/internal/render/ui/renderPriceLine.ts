/**
 * FLOW L-UI: Render Price Line - линия текущей цены
 * 
 * Используется и для свечного, и для линейного графика.
 * Рисует линию и метку справа точно как в свечном графике.
 */

import type { TimePriceViewport } from './viewport.types';

interface RenderPriceLineParams {
  ctx: CanvasRenderingContext2D;
  price: number;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту) */
  digits?: number;
}

const PRICE_LINE_COLOR = '#3347ff';
const PRICE_LINE_WIDTH = 1;
const LABEL_COLOR = '#3347ff';
const LABEL_BG_COLOR = 'rgba(51, 71, 255, 0.2)';
const LABEL_FONT = '12px sans-serif';
const LABEL_PADDING = 6;

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
 * Форматирует цену: по digits инструмента или по величине (fallback).
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '—';
  if (digits != null) return price.toFixed(digits);
  const decimals = price >= 1000 ? 0 : price >= 100 ? 1 : price >= 10 ? 2 : 3;
  return price.toFixed(decimals);
}

export function renderPriceLine({
  ctx,
  price,
  viewport,
  width,
  height,
  digits,
}: RenderPriceLineParams): void {
  const y = priceToY(price, viewport, height);

  // Проверяем, что линия видна
  if (y < 0 || y > height) {
    return;
  }

  ctx.save();

  // Рисуем горизонтальную линию (как в свечном графике)
  ctx.strokeStyle = PRICE_LINE_COLOR;
  ctx.lineWidth = PRICE_LINE_WIDTH;
  ctx.setLineDash([]); // Сплошная линия, как в свечном
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  // Рисуем label справа (точно как в свечном графике)
  const label = formatPrice(price, digits);
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(label);
  const labelWidth = metrics.width + LABEL_PADDING * 2;
  const labelHeight = 20;
  const labelX = width - labelWidth;
  const labelY = y;

  // Фон для label
  ctx.fillStyle = LABEL_BG_COLOR;
  ctx.fillRect(labelX, labelY - labelHeight / 2, labelWidth, labelHeight);

  // Текст label
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(label, labelX + LABEL_PADDING, labelY);

  ctx.restore();
}
