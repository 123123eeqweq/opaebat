/**
 * FLOW L-UI-2: Render Time Axis - метки времени снизу
 * 
 * Используется для линейного графика.
 * Таймфреймов НЕТ — это просто время.
 */

import type { TimePriceViewport } from './viewport.types';

interface RenderTimeAxisParams {
  ctx: CanvasRenderingContext2D;
  viewport: TimePriceViewport;
  width: number;
  height: number;
}

const LABEL_COLOR = 'rgba(255, 255, 255, 0.45)';
const LABEL_FONT = '12px sans-serif';
const LABEL_PADDING = 8; // Точно как в свечном графике (renderAxes.ts)
const MIN_LABEL_SPACING = 60; // Минимальное расстояние между метками в пикселях
const TIME_LABEL_BG_HEIGHT = 25;
const LABEL_BG_COLOR = '#05122a'; // Чуть темнее фона графика

/**
 * Конвертирует время в X координату
 */
function timeToX(time: number, viewport: TimePriceViewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Форматирует время в HH:mm:ss
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Вычисляет оптимальный шаг для меток времени
 */
function calculateTimeStep(timeRange: number, width: number): number {
  const targetLabels = Math.floor(width / MIN_LABEL_SPACING);
  if (targetLabels <= 0) return timeRange;
  
  const timePerLabel = timeRange / targetLabels;
  
  // Округляем до "красивых" значений (5-10 секунд визуально)
  if (timePerLabel < 1000) {
    // Меньше секунды - округляем до секунд
    return Math.ceil(timePerLabel / 1000) * 1000;
  } else if (timePerLabel < 60000) {
    // Меньше минуты - округляем до секунд (5s, 10s, 30s)
    const seconds = Math.ceil(timePerLabel / 1000);
    if (seconds <= 5) return 5000;
    if (seconds <= 10) return 10000;
    if (seconds <= 30) return 30000;
    return 60000;
  } else {
    // Минуты или больше
    const minutes = Math.ceil(timePerLabel / 60000);
    return minutes * 60000;
  }
}

export function renderTimeAxis({
  ctx,
  viewport,
  width,
  height,
}: RenderTimeAxisParams): void {
  const { timeStart, timeEnd } = viewport;
  const timeRange = timeEnd - timeStart;

  if (timeRange <= 0) return;

  ctx.save();

  // Общий фон для меток времени внизу (чуть темнее фона графика)
  ctx.fillStyle = LABEL_BG_COLOR;
  ctx.fillRect(0, height - TIME_LABEL_BG_HEIGHT, width, TIME_LABEL_BG_HEIGHT);

  // Настройки текста (точно как в свечном графике)
  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic'; // Нижняя граница символов на y (как в свечном)

  // Вычисляем шаг времени
  const stepMs = calculateTimeStep(timeRange, width);

  // Начальное время (выравниваем по шагу)
  const startTime = Math.ceil(timeStart / stepMs) * stepMs;

  // Рисуем метки времени (точно как в свечном графике)
  for (let time = startTime; time <= timeEnd; time += stepMs) {
    const x = timeToX(time, viewport, width);

    // Проверяем, что метка видна
    if (x < 0 || x > width) continue;

    // Текст метки снизу: y = height - LABEL_PADDING (низ текста в 8px от низа области)
    const timeText = formatTime(time);
    ctx.fillText(timeText, x, height - LABEL_PADDING);
  }

  ctx.restore();
}
