/**
 * renderCrosshair.ts - отрисовка crosshair
 * 
 * FLOW G7: Crosshair rendering
 */

import type { CrosshairState } from './crosshair.types';
import type { InteractionZone } from '../interactions/interaction.types';

interface RenderCrosshairParams {
  ctx: CanvasRenderingContext2D;
  crosshair: CrosshairState | null;
  width: number;
  height: number;
  /**
   * Регистрация hit‑зон для взаимодействий (например, кнопка добавления алерта)
   */
  registerInteractionZone?: (zone: InteractionZone) => void;
  /** Количество знаков после запятой для цен (по инструменту). */
  digits?: number;
}

const LINE_COLOR = 'rgba(64, 100, 143, 0.5)'; // Полупрозрачная синяя линия (#40648f)
const LINE_WIDTH = 1;
const LABEL_BG_COLOR = '#40648f'; // Синий фон для меток цены (справа)
const LABEL_PADDING = 6;
const LABEL_FONT = '12px monospace';
const LABEL_BORDER_RADIUS = 6; // Скругление углов

// Метка времени внизу — время под курсором (как у метки цены: читаемо и заметно)
const TIME_FONT = LABEL_FONT; // 12px monospace — тот же шрифт, что у цены
const TIME_PADDING_H = 8;
const TIME_OFFSET_FROM_BOTTOM = 8;
const TIME_BG = LABEL_BG_COLOR; // тот же синий, что у метки цены
const TIME_BORDER = 'rgba(255,255,255,0.25)';
const TIME_TEXT = '#ffffff'; // белый текст, как у цены — хорошо виден на синем

/** Время под курсором: viewport отдаёт ms, Date(ms) → HH:mm:ss */
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

/**
 * Форматирует цену: по digits инструмента или 2 по умолчанию.
 */
function formatPrice(price: number, digits?: number): string {
  return price.toFixed(digits ?? 2);
}

/**
 * Рисует только метку времени внизу (время под курсором).
 * Вызывается последней в кадре, чтобы ничего не перекрывало текст.
 */
export function renderCrosshairTimeLabel(
  ctx: CanvasRenderingContext2D,
  crosshair: CrosshairState | null,
  width: number,
  height: number
): void {
  if (!crosshair?.isActive) return;

  const text = formatTime(crosshair.time);
  ctx.save();

  ctx.font = TIME_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width;
  const boxW = tw + TIME_PADDING_H * 2;
  const boxH = 20;
  let x = crosshair.x - boxW / 2;
  x = Math.max(2, Math.min(x, width - boxW - 2));
  const y = height - TIME_OFFSET_FROM_BOTTOM - boxH / 2;

  // Фон метки
  ctx.fillStyle = TIME_BG;
  ctx.strokeStyle = TIME_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y - boxH / 2, boxW, boxH, 4);
  ctx.fill();
  ctx.stroke();

  // Текст поверх фона: сначала обводка, потом заливка — чтобы был виден на любом фоне
  const textX = x + boxW / 2;
  ctx.font = TIME_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(text, textX, y);
  ctx.fillStyle = TIME_TEXT;
  ctx.fillText(text, textX, y);

  ctx.restore();
}

export function renderCrosshair({
  ctx,
  crosshair,
  width,
  height,
  registerInteractionZone,
  digits,
}: RenderCrosshairParams): void {
  if (!crosshair || !crosshair.isActive) {
    return;
  }

  ctx.save();

  // Рисуем вертикальную линию
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.beginPath();
  ctx.moveTo(crosshair.x, 0);
  ctx.lineTo(crosshair.x, height);
  ctx.stroke();

  // Рисуем горизонтальную линию
  ctx.beginPath();
  ctx.moveTo(0, crosshair.y);
  ctx.lineTo(width, crosshair.y);
  ctx.stroke();

  // Метка времени внизу рисуется отдельно в конце кадра (renderCrosshairTimeLabel),
  // чтобы её не перекрывали drawings / OHLC

  // Метка цены (справа)
  const priceLabel = formatPrice(crosshair.price, digits);
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; // Выравнивание влево для метки цены
  const priceMetrics = ctx.measureText(priceLabel);
  const priceLabelWidth = priceMetrics.width;
  const priceLabelHeight = 20;
  const priceLabelX = width - priceLabelWidth - LABEL_PADDING * 2;
  const priceLabelY = Math.max(priceLabelHeight / 2 + LABEL_PADDING, Math.min(crosshair.y, height - priceLabelHeight / 2 - LABEL_PADDING));

  // Фон для метки цены
  ctx.fillStyle = LABEL_BG_COLOR;
  ctx.roundRect(
    priceLabelX - LABEL_PADDING,
    priceLabelY - priceLabelHeight / 2 - LABEL_PADDING,
    priceLabelWidth + LABEL_PADDING * 2,
    priceLabelHeight + LABEL_PADDING * 2,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  // Текст метки цены (яркий белый для максимальной видимости)
  // Явно устанавливаем все свойства текста
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  // Используем обводку для лучшей видимости на синем фоне
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'; // Темная обводка для контраста
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(priceLabel, priceLabelX, priceLabelY);
  // Яркий белый текст поверх обводки
  ctx.fillStyle = '#ffffff';
  ctx.fillText(priceLabel, priceLabelX, priceLabelY);

  // FLOW A2: Price Alert "+" слева от метки цены (справа от метки она уходит за край)
  if (registerInteractionZone) {
    const plusSize = 16;
    const plusPadding = 6;

    // Кнопка слева от блока с ценой: [➕] [ 49934.09 ]
    const plusX = priceLabelX - LABEL_PADDING - plusSize - plusPadding;
    const plusY = priceLabelY - plusSize / 2;

    // Рисуем фон для кнопки "+"
    ctx.fillStyle = 'rgba(255, 212, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(plusX, plusY, plusSize, plusSize, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 212, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Рисуем плюс
    ctx.strokeStyle = '#FFD400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plusX + plusSize / 2, plusY + 4);
    ctx.lineTo(plusX + plusSize / 2, plusY + plusSize - 4);
    ctx.moveTo(plusX + 4, plusY + plusSize / 2);
    ctx.lineTo(plusX + plusSize - 4, plusY + plusSize / 2);
    ctx.stroke();

    // Регистрируем hit‑зону для клика
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
