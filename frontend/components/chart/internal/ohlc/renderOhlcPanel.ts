/**
 * renderOhlcPanel.ts - отрисовка OHLC панели
 * 
 * FLOW G8: OHLC panel rendering
 */

import type { OhlcData } from './ohlc.types';

interface RenderOhlcPanelParams {
  ctx: CanvasRenderingContext2D;
  ohlc: OhlcData | null;
  width: number;
  height: number;
  /** Количество знаков после запятой для цен (по инструменту). */
  digits?: number;
}

const PANEL_BG_COLOR = 'rgba(0, 0, 0, 0.8)'; // Тёмный фон
const PANEL_TEXT_COLOR = '#ffffff';
const PANEL_PADDING = 10;
const PANEL_MARGIN = 10;
const PANEL_FONT = '12px monospace';
const PANEL_LINE_HEIGHT = 18;
const LIVE_LABEL_COLOR = '#10b981'; // Зелёный для LIVE

/**
 * Форматирует цену: по digits инструмента или 5 по умолчанию (forex).
 */
function formatPrice(price: number, digits?: number): string {
  return price.toFixed(digits ?? 5);
}

export function renderOhlcPanel({
  ctx,
  ohlc,
  width,
  height,
  digits,
}: RenderOhlcPanelParams): void {
  if (!ohlc) {
    return;
  }

  ctx.save();

  // Настройки текста
  ctx.font = PANEL_FONT;
  ctx.fillStyle = PANEL_TEXT_COLOR;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Форматируем значения по digits инструмента
  const openLabel = `O: ${formatPrice(ohlc.open, digits)}`;
  const highLabel = `H: ${formatPrice(ohlc.high, digits)}`;
  const lowLabel = `L: ${formatPrice(ohlc.low, digits)}`;
  const closeLabel = `C: ${formatPrice(ohlc.close, digits)}`;

  // Измеряем размеры текста
  const openMetrics = ctx.measureText(openLabel);
  const highMetrics = ctx.measureText(highLabel);
  const lowMetrics = ctx.measureText(lowLabel);
  const closeMetrics = ctx.measureText(closeLabel);

  // Находим максимальную ширину
  const maxWidth = Math.max(
    openMetrics.width,
    highMetrics.width,
    lowMetrics.width,
    closeMetrics.width
  );

  // Вычисляем размеры панели
  const panelWidth = maxWidth + PANEL_PADDING * 2;
  const lineCount = ohlc.isLive ? 5 : 4; // +1 для LIVE метки
  const panelHeight = lineCount * PANEL_LINE_HEIGHT + PANEL_PADDING * 2;

  // Позиция панели (левый нижний угол)
  const panelX = PANEL_MARGIN;
  const panelY = height - panelHeight - PANEL_MARGIN;

  // Рисуем фон панели
  ctx.fillStyle = PANEL_BG_COLOR;
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  // Рисуем текст
  let currentY = panelY + PANEL_PADDING;

  // LIVE метка (если isLive)
  if (ohlc.isLive) {
    ctx.fillStyle = LIVE_LABEL_COLOR;
    ctx.fillText('LIVE', panelX + PANEL_PADDING, currentY);
    currentY += PANEL_LINE_HEIGHT;
  }

  // OHLC данные
  ctx.fillStyle = PANEL_TEXT_COLOR;
  ctx.fillText(openLabel, panelX + PANEL_PADDING, currentY);
  currentY += PANEL_LINE_HEIGHT;

  ctx.fillText(highLabel, panelX + PANEL_PADDING, currentY);
  currentY += PANEL_LINE_HEIGHT;

  ctx.fillText(lowLabel, panelX + PANEL_PADDING, currentY);
  currentY += PANEL_LINE_HEIGHT;

  ctx.fillText(closeLabel, panelX + PANEL_PADDING, currentY);

  ctx.restore();
}
