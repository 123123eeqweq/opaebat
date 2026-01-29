/**
 * renderIndicators.ts - отрисовка индикаторов
 * 
 * FLOW G12: Indicator rendering
 */

import type { IndicatorSeries, IndicatorConfig } from './indicator.types';
import type { Viewport } from '../viewport.types';

interface RenderIndicatorsParams {
  ctx: CanvasRenderingContext2D;
  indicators: IndicatorSeries[];
  indicatorConfigs: IndicatorConfig[]; // Конфигурация для получения цветов
  viewport: Viewport;
  width: number;
  height: number;
  rsiHeight?: number; // Высота зоны RSI (по умолчанию 0, если RSI не нужен)
  stochHeight?: number; // Высота зоны Stochastic (по умолчанию 0)
  momentumHeight?: number; // Высота зоны Momentum (гистограмма, по умолчанию 0)
}

const RSI_ZONE_HEIGHT = 120; // Высота зоны RSI
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;
const STOCH_OVERBOUGHT = 80;
const STOCH_OVERSOLD = 20;
const LINE_WIDTH = 1.5; // Уменьшаем толщину линий индикаторов, чтобы не перекрывать свечи

/**
 * Конвертирует время в X координату
 */
function timeToX(time: number, viewport: Viewport, width: number): number {
  const timeRange = viewport.timeEnd - viewport.timeStart;
  if (timeRange === 0) return 0;
  return ((time - viewport.timeStart) / timeRange) * width;
}

/**
 * Конвертирует цену в Y координату (для основного графика)
 */
function priceToY(price: number, viewport: Viewport, height: number): number {
  const priceRange = viewport.priceMax - viewport.priceMin;
  if (priceRange === 0) return height / 2;
  return height - ((price - viewport.priceMin) / priceRange) * height;
}

/**
 * Конвертирует RSI значение в Y координату (для зоны RSI)
 */
function rsiToY(rsi: number, rsiHeight: number): number {
  // RSI в диапазоне 0-100
  return rsiHeight - (rsi / 100) * rsiHeight;
}

/**
 * Конвертирует значение осциллятора 0–100 в Y (для зоны Stochastic)
 */
function oscToY(value: number, zoneHeight: number): number {
  return zoneHeight - (value / 100) * zoneHeight;
}

/**
 * Рисует линию индикатора (SMA/EMA/Bollinger)
 */
function renderIndicatorLine(
  ctx: CanvasRenderingContext2D,
  points: Array<{ time: number; value: number }>,
  viewport: Viewport,
  width: number,
  height: number,
  color: string,
  isRSI: boolean = false,
  rsiHeight: number = 0,
  opacity: number = 0.7
): void {
  if (points.length === 0) return;

  // Фильтруем точки, видимые в viewport
  const visiblePoints = points.filter(p => 
    p.time >= viewport.timeStart && p.time <= viewport.timeEnd
  );

  if (visiblePoints.length === 0) return;

  ctx.save();
  // Конвертируем hex в rgba с прозрачностью
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  ctx.strokeStyle = hexToRgba(color, opacity);
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();

  for (let i = 0; i < visiblePoints.length; i++) {
    const point = visiblePoints[i];
    const x = timeToX(point.time, viewport, width);
    
    let y: number;
    if (isRSI) {
      y = rsiToY(point.value, rsiHeight);
    } else {
      y = priceToY(point.value, viewport, height);
    }

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Рисует RSI зону с уровнями
 */
function renderRSIZone(
  ctx: CanvasRenderingContext2D,
  rsiSeries: IndicatorSeries,
  indicatorConfigs: IndicatorConfig[],
  viewport: Viewport,
  width: number,
  rsiHeight: number,
  mainHeight: number
): void {
  const yOffset = mainHeight; // RSI зона начинается после основного графика

  ctx.save();

  // Фон зоны RSI
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, rsiHeight);

  // Уровни 30 и 70
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  // Уровень 70 (overbought)
  const y70 = yOffset + rsiToY(RSI_OVERBOUGHT, rsiHeight);
  ctx.beginPath();
  ctx.moveTo(0, y70);
  ctx.lineTo(width, y70);
  ctx.stroke();

  // Уровень 30 (oversold)
  const y30 = yOffset + rsiToY(RSI_OVERSOLD, rsiHeight);
  ctx.beginPath();
  ctx.moveTo(0, y30);
  ctx.lineTo(width, y30);
  ctx.stroke();

  ctx.setLineDash([]);

  // Рисуем RSI линию
  const config = indicatorConfigs.find(c => c.id === rsiSeries.id);
  const color = config?.color || '#f97316';
  
  // Создаём локальный viewport для RSI (0-100)
  const rsiViewport: Viewport = {
    timeStart: viewport.timeStart,
    timeEnd: viewport.timeEnd,
    priceMin: 0,
    priceMax: 100,
  };

  ctx.translate(0, yOffset);
  renderIndicatorLine(ctx, rsiSeries.points, rsiViewport, width, rsiHeight, color, true, rsiHeight);
  ctx.translate(0, -yOffset);

  ctx.restore();
}

/**
 * Рисует зону Stochastic (%K, %D) с уровнями 20 и 80
 */
function renderStochasticZone(
  ctx: CanvasRenderingContext2D,
  kSeries: IndicatorSeries,
  dSeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  stochHeight: number,
  yOffset: number
): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, stochHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  const y80 = yOffset + oscToY(STOCH_OVERBOUGHT, stochHeight);
  ctx.beginPath();
  ctx.moveTo(0, y80);
  ctx.lineTo(width, y80);
  ctx.stroke();

  const y20 = yOffset + oscToY(STOCH_OVERSOLD, stochHeight);
  ctx.beginPath();
  ctx.moveTo(0, y20);
  ctx.lineTo(width, y20);
  ctx.stroke();

  ctx.setLineDash([]);

  const stochViewport: Viewport = {
    timeStart: viewport.timeStart,
    timeEnd: viewport.timeEnd,
    priceMin: 0,
    priceMax: 100,
  };

  ctx.translate(0, yOffset);
  renderIndicatorLine(ctx, kSeries.points, stochViewport, width, stochHeight, config.color, true, stochHeight);
  renderIndicatorLine(ctx, dSeries.points, stochViewport, width, stochHeight, config.colorD ?? '#c084fc', true, stochHeight);
  ctx.translate(0, -yOffset);

  ctx.restore();
}

const MOMENTUM_GREEN = '#22c55e';
const MOMENTUM_RED = '#ef4444';
/** Доля половины высоты, которую занимают столбцы — чтобы не вылезали за край (0.65 = 65%) */
const MOMENTUM_HEIGHT_RATIO = 0.65;
/** Доля ширины слота на одну свечу — тонкий столбик «1 свеча = 1 бар» */
const MOMENTUM_BAR_WIDTH_RATIO = 0.6;

/**
 * Рисует зону Momentum: гистограмма с нулевой линией по центру, зелёные вверх, красные вниз.
 * Один столбец на одну свечу; высота ограничена, чтобы не вылезала.
 */
function renderMomentumZone(
  ctx: CanvasRenderingContext2D,
  series: IndicatorSeries,
  viewport: Viewport,
  width: number,
  zoneHeight: number,
  yOffset: number
): void {
  const visiblePoints = series.points.filter(
    (p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd
  );
  if (visiblePoints.length === 0) return;

  const centerY = zoneHeight / 2;
  const valuesAbs = visiblePoints.map((p) => Math.abs(p.value));
  const sorted = [...valuesAbs].sort((a, b) => a - b);
  const p90Index = Math.min(Math.floor(sorted.length * 0.9), sorted.length - 1);
  const scaleRaw = sorted.length > 0 ? sorted[p90Index] : 1;
  const scale = scaleRaw < 1e-12 ? 1 : scaleRaw;
  const halfRange = centerY * MOMENTUM_HEIGHT_RATIO;

  function valueToY(v: number): number {
    return centerY - (v / scale) * halfRange;
  }

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, zoneHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yOffset + centerY);
  ctx.lineTo(width, yOffset + centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(0, yOffset);

  const timeRange = viewport.timeEnd - viewport.timeStart || 1;
  const slotWidth = width / visiblePoints.length;
  const barWidth = Math.max(2, slotWidth * MOMENTUM_BAR_WIDTH_RATIO);

  for (let i = 0; i < visiblePoints.length; i++) {
    const point = visiblePoints[i];
    const x = ((point.time - viewport.timeStart) / timeRange) * width;
    const left = x - barWidth / 2;
    const y = valueToY(point.value);

    if (point.value >= 0) {
      ctx.fillStyle = MOMENTUM_GREEN;
      ctx.fillRect(left, y, barWidth, centerY - y);
    } else {
      ctx.fillStyle = MOMENTUM_RED;
      ctx.fillRect(left, centerY, barWidth, y - centerY);
    }
  }

  ctx.translate(0, -yOffset);
  ctx.restore();
}

/**
 * Рисует Bollinger Bands на основном графике: заливка между upper/lower + 3 линии
 */
function renderBollingerBands(
  ctx: CanvasRenderingContext2D,
  upperSeries: IndicatorSeries,
  middleSeries: IndicatorSeries,
  lowerSeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  height: number
): void {
  const upper = upperSeries.points.filter(p => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  const lower = lowerSeries.points.filter(p => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  if (upper.length === 0 || lower.length === 0) return;

  const color = config.color;
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  ctx.save();

  // Заливка между upper и lower
  ctx.beginPath();
  for (let i = 0; i < upper.length; i++) {
    const u = upper[i];
    const l = lower[i];
    const x = timeToX(u.time, viewport, width);
    const yU = priceToY(u.value, viewport, height);
    const yL = priceToY(l.value, viewport, height);
    if (i === 0) ctx.moveTo(x, yU);
    else ctx.lineTo(x, yU);
  }
  for (let i = upper.length - 1; i >= 0; i--) {
    const l = lower[i];
    const x = timeToX(l.time, viewport, width);
    const yL = priceToY(l.value, viewport, height);
    ctx.lineTo(x, yL);
  }
  ctx.closePath();
  ctx.fillStyle = hexToRgba(color, 0.08);
  ctx.fill();

  // Линии: upper/lower — полупрозрачные, middle — ярче
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  renderIndicatorLine(ctx, upperSeries.points, viewport, width, height, color, false, 0, 0.5);
  renderIndicatorLine(ctx, middleSeries.points, viewport, width, height, color, false, 0, 0.9);
  renderIndicatorLine(ctx, lowerSeries.points, viewport, width, height, color, false, 0, 0.5);

  ctx.restore();
}

export function renderIndicators({
  ctx,
  indicators,
  indicatorConfigs,
  viewport,
  width,
  height,
  rsiHeight = 0,
  stochHeight = 0,
  momentumHeight = 0,
}: RenderIndicatorsParams): void {
  if (indicators.length === 0) return;

  // Разделяем индикаторы на SMA/EMA, Bollinger Bands, RSI, Stochastic и Momentum
  const lineIndicators = indicators.filter(i => i.type === 'SMA' || i.type === 'EMA');
  const rsiIndicators = indicators.filter(i => i.type === 'RSI');
  const stochConfigs = indicatorConfigs.filter(c => c.type === 'Stochastic' && c.enabled);
  const momentumIndicators = indicators.filter(i => i.type === 'Momentum');
  const bbConfigs = indicatorConfigs.filter(c => c.type === 'BollingerBands' && c.enabled);

  // Рисуем SMA/EMA линии поверх свечей (в основной зоне)
  for (const series of lineIndicators) {
    const config = indicatorConfigs.find(c => c.id === series.id);
    if (!config) continue;

    renderIndicatorLine(
      ctx,
      series.points,
      viewport,
      width,
      height,
      config.color
    );
  }

  // Рисуем Bollinger Bands: заливка между полосами + 3 линии (upper, middle, lower)
  for (const config of bbConfigs) {
    const upperSeries = indicators.find(i => i.type === 'BollingerBands' && i.id === config.id + '_upper');
    const middleSeries = indicators.find(i => i.type === 'BollingerBands' && i.id === config.id + '_middle');
    const lowerSeries = indicators.find(i => i.type === 'BollingerBands' && i.id === config.id + '_lower');
    if (upperSeries && middleSeries && lowerSeries) {
      renderBollingerBands(ctx, upperSeries, middleSeries, lowerSeries, config, viewport, width, height);
    }
  }

  // Рисуем RSI зону (если есть RSI индикаторы)
  if (rsiHeight > 0) {
    for (const rsiSeries of rsiIndicators) {
      renderRSIZone(ctx, rsiSeries, indicatorConfigs, viewport, width, rsiHeight, height);
    }
  }

  // Рисуем Stochastic зону (%K, %D) под RSI
  if (stochHeight > 0) {
    const stochYOffset = height + rsiHeight;
    for (const config of stochConfigs) {
      const kSeries = indicators.find(i => i.type === 'Stochastic' && i.id === config.id + '_k');
      const dSeries = indicators.find(i => i.type === 'Stochastic' && i.id === config.id + '_d');
      if (kSeries && dSeries) {
        renderStochasticZone(ctx, kSeries, dSeries, config, viewport, width, stochHeight, stochYOffset);
      }
    }
  }

  // Рисуем Momentum зону (гистограмма) под Stochastic
  if (momentumHeight > 0) {
    const momentumYOffset = height + rsiHeight + stochHeight;
    for (const series of momentumIndicators) {
      renderMomentumZone(ctx, series, viewport, width, momentumHeight, momentumYOffset);
    }
  }
}
