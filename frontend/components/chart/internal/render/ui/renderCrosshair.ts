/**
 * FLOW L-UI: Render Crosshair - унифицированный курсор
 * 
 * Используется и для свечного, и для линейного графика.
 * Работает только с mouse.x/y и viewport, без логики свечей.
 */

import type { TimePriceViewport } from './viewport.types';
import type { CrosshairState } from '../../crosshair/crosshair.types';
import type { InteractionZone } from '../../interactions/interaction.types';

interface RenderCrosshairParams {
  ctx: CanvasRenderingContext2D;
  crosshair: CrosshairState | null;
  viewport: TimePriceViewport;
  width: number;
  height: number;
  registerInteractionZone?: (zone: InteractionZone) => void;
  digits?: number;
}

const LINE_COLOR = 'rgba(64, 100, 143, 0.5)';
const LINE_WIDTH = 1;
const LABEL_BG_COLOR = '#40648f';
const LABEL_PADDING = 6;
const LABEL_FONT = '12px sans-serif';
const LABEL_BORDER_RADIUS = 6;

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
 * Конвертирует X координату во время
 */
function xToTime(x: number, viewport: TimePriceViewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return viewport.timeStart;
  return viewport.timeStart + (x / width) * timeRange;
}

/**
 * Форматирует цену
 */
function formatPrice(price: number, digits?: number): string {
  if (!Number.isFinite(price)) return '—';
  return price.toFixed(digits ?? 2);
}

/**
 * Форматирует время
 */
function formatTime(ts: number): string {
  if (!Number.isFinite(ts)) return '--:--:--';
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':');
}

export function renderCrosshair({
  ctx,
  crosshair,
  viewport,
  width,
  height,
  registerInteractionZone,
  digits,
}: RenderCrosshairParams): void {
  if (!crosshair || !crosshair.isActive) {
    return;
  }

  ctx.save();

  // Вертикальная линия
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(crosshair.x, 0);
  ctx.lineTo(crosshair.x, height);
  ctx.stroke();

  // Горизонтальная линия
  ctx.beginPath();
  ctx.moveTo(0, crosshair.y);
  ctx.lineTo(width, crosshair.y);
  ctx.stroke();

  // Метка цены (справа)
  const priceLabel = formatPrice(crosshair.price, digits);
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const priceMetrics = ctx.measureText(priceLabel);
  const priceLabelWidth = priceMetrics.width;
  const priceLabelHeight = 20;
  const priceLabelX = width - priceLabelWidth - LABEL_PADDING * 2;
  const priceLabelY = Math.max(
    priceLabelHeight / 2 + LABEL_PADDING,
    Math.min(crosshair.y, height - priceLabelHeight / 2 - LABEL_PADDING)
  );

  // Фон для метки цены
  // 🔥 FIX: beginPath() перед roundRect — без этого path от линий кроссхейра
  // остаётся активным и fill() заливает весь накопленный path
  ctx.beginPath();
  ctx.fillStyle = LABEL_BG_COLOR;
  ctx.roundRect(
    priceLabelX - LABEL_PADDING,
    priceLabelY - priceLabelHeight / 2 - LABEL_PADDING,
    priceLabelWidth + LABEL_PADDING * 2,
    priceLabelHeight + LABEL_PADDING * 2,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  // Текст метки цены
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(priceLabel, priceLabelX, priceLabelY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(priceLabel, priceLabelX, priceLabelY);

  // Кнопка "+" для алерта (если нужно)
  if (registerInteractionZone) {
    const plusSize = 16;
    const plusPadding = 6;
    const plusX = priceLabelX - LABEL_PADDING - plusSize - plusPadding;
    const plusY = priceLabelY - plusSize / 2;

    ctx.fillStyle = 'rgba(255, 212, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(plusX, plusY, plusSize, plusSize, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 212, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#FFD400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plusX + plusSize / 2, plusY + 4);
    ctx.lineTo(plusX + plusSize / 2, plusY + plusSize - 4);
    ctx.moveTo(plusX + 4, plusY + plusSize / 2);
    ctx.lineTo(plusX + plusSize - 4, plusY + plusSize / 2);
    ctx.stroke();

    registerInteractionZone({
      type: 'add-alert',
      x: plusX,
      y: plusY,
      width: plusSize,
      height: plusSize,
      price: crosshair.price,
    });
  }

  ctx.restore();
}

/**
 * Рендерит метку времени внизу (отдельно, чтобы была поверх всего)
 */
export function renderCrosshairTimeLabel(
  ctx: CanvasRenderingContext2D,
  crosshair: CrosshairState | null,
  viewport: TimePriceViewport,
  width: number,
  height: number
): void {
  if (!crosshair?.isActive) return;

  const time = xToTime(crosshair.x, viewport, width);
  const text = formatTime(time);

  ctx.save();

  const TIME_PADDING_H = 8;
  const TIME_LABEL_AREA_HEIGHT = 25;
  const TIME_BG = '#40648f';
  const TIME_BORDER = 'rgba(255,255,255,0.25)';
  const TIME_TEXT = '#ffffff';

  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width;
  const boxW = tw + TIME_PADDING_H * 2;
  const boxH = 20;
  let x = crosshair.x - boxW / 2;
  x = Math.max(2, Math.min(x, width - boxW - 2));

  // Фон метки — до самого низа, без отступа
  ctx.fillStyle = TIME_BG;
  ctx.strokeStyle = TIME_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, height - TIME_LABEL_AREA_HEIGHT, boxW, TIME_LABEL_AREA_HEIGHT, 4);
  ctx.fill();
  ctx.stroke();

  // Текст — по центру области
  const textX = x + boxW / 2;
  const textY = height - TIME_LABEL_AREA_HEIGHT / 2;
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(text, textX, textY);
  ctx.fillStyle = TIME_TEXT;
  ctx.fillText(text, textX, textY);

  ctx.restore();
}
