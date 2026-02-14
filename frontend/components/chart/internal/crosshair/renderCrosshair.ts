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
const LABEL_FONT = '12px sans-serif';
const LABEL_BORDER_RADIUS = 6; // Скругление углов

// Метка времени внизу — время под курсором (как у метки цены: читаемо и заметно)
const TIME_FONT = LABEL_FONT;
const TIME_PADDING_H = 8;
const TIME_OFFSET_FROM_BOTTOM = 0; // Без отступа снизу
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
  if (!Number.isFinite(price)) return '—';
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
  // Метка закрывает всю область меток времени (высота 25px) и доходит до самого низа
  const TIME_LABEL_AREA_HEIGHT = 25; // Высота области меток времени
  const y = height - boxH / 2;

  // Фон метки - позиционируем так, чтобы закрывать область меток времени и доходить до низа
  ctx.fillStyle = TIME_BG;
  ctx.strokeStyle = TIME_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, height - TIME_LABEL_AREA_HEIGHT, boxW, TIME_LABEL_AREA_HEIGHT, 4);
  ctx.fill();
  ctx.stroke();

  // Текст без обводки - по центру области меток времени
  const textX = x + boxW / 2;
  const textY = height - TIME_LABEL_AREA_HEIGHT / 2;
  ctx.font = TIME_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = TIME_TEXT;
  ctx.fillText(text, textX, textY);

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

  // Метка цены (справа) - закрывает область меток цены
  const priceLabel = formatPrice(crosshair.price, digits);
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const priceMetrics = ctx.measureText(priceLabel);
  const priceLabelWidth = priceMetrics.width;
  const PRICE_LABEL_AREA_WIDTH = 60; // Ширина области меток цены (как PRICE_LABEL_BG_WIDTH)
  const priceLabelHeight = 26; // Увеличена высота метки цены
  
  // Позиционируем метку так, чтобы она закрывала область меток цены справа
  const priceLabelX = width - PRICE_LABEL_AREA_WIDTH + LABEL_PADDING;
  const priceLabelY = crosshair.y;
  
  // Ограничиваем позицию по вертикали, чтобы метка не выходила за границы
  const clampedY = Math.max(priceLabelHeight / 2, Math.min(priceLabelY, height - priceLabelHeight / 2));

  // Вычисляем точную позицию фона метки
  const backgroundTop = clampedY - priceLabelHeight / 2;
  const backgroundCenter = backgroundTop + priceLabelHeight / 2;

  // Фон для метки цены - закрывает всю область меток цены
  // 🔥 FIX: beginPath() обязателен перед roundRect, иначе path от горизонтальной линии
  // кроссхейра остаётся активным → fill() заливает и линию и прямоугольник
  ctx.beginPath();
  ctx.fillStyle = LABEL_BG_COLOR;
  ctx.roundRect(
    width - PRICE_LABEL_AREA_WIDTH,
    backgroundTop,
    PRICE_LABEL_AREA_WIDTH,
    priceLabelHeight,
    LABEL_BORDER_RADIUS
  );
  ctx.fill();

  // Текст метки цены без обводки - центрируем по вертикали точно по центру фона
  ctx.font = LABEL_FONT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  // Используем явно вычисленный центр фона для точного центрирования
  ctx.fillText(priceLabel, priceLabelX, backgroundCenter);

  // FLOW A2: Price Alert "+" слева от метки цены (справа от метки она уходит за край)
  if (registerInteractionZone) {
    const plusSize = priceLabelHeight - 4; // Чуть меньше чем метка цены
    const plusPadding = 6;

    // Кнопка слева от блока с ценой: [➕] [ 49934.09 ]
    const plusX = priceLabelX - LABEL_PADDING - plusSize - plusPadding;
    const plusY = clampedY - plusSize / 2; // Выравниваем по центру метки цены

    // Рисуем фон для кнопки "+" - используем тот же цвет что и у метки цены
    ctx.fillStyle = LABEL_BG_COLOR;
    ctx.beginPath();
    ctx.roundRect(plusX, plusY, plusSize, plusSize, LABEL_BORDER_RADIUS); // Такие же скругления как у метки
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Светлая обводка как у метки
    ctx.lineWidth = 1;
    ctx.stroke();

    // Рисуем плюс - белый цвет как у текста метки
    const plusIconPadding = 8; // Отступ для иконки
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plusX + plusSize / 2, plusY + plusIconPadding);
    ctx.lineTo(plusX + plusSize / 2, plusY + plusSize - plusIconPadding);
    ctx.moveTo(plusX + plusIconPadding, plusY + plusSize / 2);
    ctx.lineTo(plusX + plusSize - plusIconPadding, plusY + plusSize / 2);
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
