/**
 * renderTrades.ts - отрисовка trade overlays на графике
 * 
 * FLOW T-OVERLAY: Trade rendering
 * 
 * Рисует:
 * - Вертикальную линию времени открытия сделки
 * - Горизонтальную линию цены входа
 * - Вертикальную линию времени экспирации
 * - Метку направления (CALL/PUT) и цены
 */

import type { Viewport } from '../viewport.types';

interface RenderTradesParams {
  ctx: CanvasRenderingContext2D;
  trades: Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
  }>;
  viewport: Viewport;
  width: number;
  height: number;
  digits?: number;
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

export function renderTrades({
  ctx,
  trades,
  viewport,
  width,
  height,
  digits = 5,
}: RenderTradesParams): void {
  if (trades.length === 0) return;

  ctx.save();

  // Фильтруем trades, которые видны в viewport
  const visibleTrades = trades.filter(
    (trade) =>
      (trade.openedAt >= viewport.timeStart && trade.openedAt <= viewport.timeEnd) ||
      (trade.expiresAt >= viewport.timeStart && trade.expiresAt <= viewport.timeEnd) ||
      (trade.openedAt <= viewport.timeStart && trade.expiresAt >= viewport.timeEnd)
  );

  if (visibleTrades.length === 0) {
    ctx.restore();
    return;
  }

  for (const trade of visibleTrades) {
    const isCall = trade.direction === 'CALL';
    const color = isCall ? '#22c55e' : '#ef4444'; // Зеленый для CALL, красный для PUT
    const lineColor = isCall ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
    const labelBg = isCall ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';

    // Рисуем вертикальную линию времени открытия
    const openX = timeToX(trade.openedAt, viewport, width);
    if (openX >= 0 && openX <= width) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(openX, 0);
      ctx.lineTo(openX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Рисуем вертикальную линию времени экспирации
    const expireX = timeToX(trade.expiresAt, viewport, width);
    if (expireX >= 0 && expireX <= width) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(expireX, 0);
      ctx.lineTo(expireX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Рисуем горизонтальную линию цены входа
    const entryY = priceToY(trade.entryPrice, viewport, height);
    if (entryY >= 0 && entryY <= height) {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.max(0, openX), entryY);
      ctx.lineTo(Math.min(width, expireX), entryY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Рисуем метку с направлением и ценой
    const labelX = Math.max(10, Math.min(openX + 5, width - 100));
    const labelY = Math.max(20, Math.min(entryY - 10, height - 30));

    // Фон метки
    const labelText = `${isCall ? 'CALL' : 'PUT'} @ ${trade.entryPrice.toFixed(digits)}`;
    ctx.font = '12px sans-serif';
    const metrics = ctx.measureText(labelText);
    const labelWidth = metrics.width + 8;
    const labelHeight = 18;

    ctx.fillStyle = labelBg;
    ctx.fillRect(labelX, labelY - labelHeight, labelWidth, labelHeight);

    // Текст метки
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX + 4, labelY - labelHeight / 2);
  }

  ctx.restore();
}
