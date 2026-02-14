/**
 * renderPriceLine.ts - отрисовка линии текущей цены
 * 
 * FLOW G4: Render Engine
 */

import type { Viewport } from '../viewport.types';

interface RenderPriceLineParams {
  ctx: CanvasRenderingContext2D; // Нативный тип браузера
  viewport: Viewport;
  currentPrice: number;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту). */
  digits?: number;
}

const PRICE_LINE_COLOR = 'rgba(64, 100, 143, 0.5)'; // Цвет как у кроссхейра
const PRICE_LINE_WIDTH = 2; // Толщина как у линии экспирации
const LABEL_COLOR = '#ffffff'; // Белый текст как у кроссхейра
const LABEL_BG_COLOR = '#40648f'; // Цвет фона как у кроссхейра
const LABEL_FONT = '12px monospace'; // Шрифт как у кроссхейра
const LABEL_PADDING = 6;
const LABEL_BORDER_RADIUS = 6; // Скругление как у кроссхейра
const PRICE_LABEL_AREA_WIDTH = 60; // Ширина области меток цены
const PRICE_LABEL_HEIGHT = 26; // Высота метки как у кроссхейра

/**
 * Конвертирует цену в Y координату
 */
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
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
  viewport,
  currentPrice,
  width,
  height,
  digits,
}: RenderPriceLineParams): void {
  const y = priceToY(currentPrice, viewport, height);

  // Проверяем, что линия видна
  if (y < 0 || y > height) {
    return;
  }

  ctx.save();

  // Ограничиваем линию, чтобы она не налазила на метки цены справа
  const TIME_LABEL_HEIGHT = 25; // Высота области меток времени
  const maxX = width - PRICE_LABEL_AREA_WIDTH;

  // Рисуем горизонтальную линию (ограничиваем по ширине и высоте)
  ctx.strokeStyle = PRICE_LINE_COLOR;
  ctx.lineWidth = PRICE_LINE_WIDTH;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  // Ограничиваем линию, чтобы не перекрывать метки цены и времени
  ctx.lineTo(maxX, y);
  ctx.stroke();

  // Рисуем label справа в области меток цены (как у кроссхейра)
  const label = formatPrice(currentPrice, digits);
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Вычисляем позицию метки в области меток цены
  const backgroundTop = y - PRICE_LABEL_HEIGHT / 2;
  const backgroundCenter = backgroundTop + PRICE_LABEL_HEIGHT / 2;
  const labelX = width - PRICE_LABEL_AREA_WIDTH + LABEL_PADDING;

  // Ограничиваем позицию по вертикали, чтобы метка не выходила за границы
  const clampedY = Math.max(PRICE_LABEL_HEIGHT / 2, Math.min(y, height - TIME_LABEL_HEIGHT - PRICE_LABEL_HEIGHT / 2));
  const clampedBackgroundTop = clampedY - PRICE_LABEL_HEIGHT / 2;
  const clampedBackgroundCenter = clampedBackgroundTop + PRICE_LABEL_HEIGHT / 2;

  // Фон для label (как у кроссхейра)
  ctx.fillStyle = LABEL_BG_COLOR;
  ctx.beginPath();
  ctx.roundRect(
    width - PRICE_LABEL_AREA_WIDTH,
    clampedBackgroundTop,
    PRICE_LABEL_AREA_WIDTH,
    PRICE_LABEL_HEIGHT,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  // Текст label (белый как у кроссхейра)
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(label, labelX, clampedBackgroundCenter);

  ctx.restore();
}
