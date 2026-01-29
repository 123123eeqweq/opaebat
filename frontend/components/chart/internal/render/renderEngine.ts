/**
 * renderEngine.ts - оркестратор рендеринга
 * 
 * Ответственность:
 * - Координация всех render-функций
 * - Очистка canvas
 * - Последовательность отрисовки
 * 
 * FLOW G4: Render Engine
 * 
 * НЕ содержит математики viewport
 */

import type { Viewport } from '../viewport.types';
import type { Candle } from '../chart.types';
import { renderGrid } from './renderGrid';
import { renderCandles } from './renderCandles';
import { renderAxes } from './renderAxes';
import { renderPriceLine } from './renderPriceLine';

import type { CandleMode } from '../candleModes/candleMode.types';

interface RenderEngineParams {
  ctx: CanvasRenderingContext2D; // Нативный тип браузера
  viewport: Viewport;
  candles: Candle[];
  liveCandle: Candle | null;
  width: number;
  height: number;
  timeframeMs: number;
  mode?: CandleMode; // FLOW G10: Режим отображения свечей
  /** Количество знаков после запятой для цен (по инструменту, напр. 5 для forex) */
  digits?: number;
}

/**
 * Render Engine - оркестратор рендеринга
 * 
 * Порядок отрисовки (снизу вверх):
 * 1. Clear
 * 2. Grid
 * 3. Candles (закрытые)
 * 4. Live candle
 * 5. Axes
 * 6. Current price line
 */
export function renderEngine({
  ctx,
  viewport,
  candles,
  liveCandle,
  width,
  height,
  timeframeMs,
  mode = 'classic', // FLOW G10: Режим отображения (по умолчанию classic)
  digits,
}: RenderEngineParams): void {
  // Примечание: clearRect вызывается в useRenderLoop перед вызовом renderEngine
  // Это позволяет корректно обрабатывать случаи с RSI зоной

  // 1. Grid
  renderGrid({ ctx, viewport, width, height, timeframeMs });

  // 3. Candles (закрытые)
  renderCandles({ ctx, viewport, candles, liveCandle, width, height, timeframeMs, mode });

  // 4. Axes (поверх свечей) — метки цены справа по digits инструмента
  renderAxes({ ctx, viewport, width, height, digits });

  // 5. Current price line (поверх всего)
  if (liveCandle) {
    renderPriceLine({ ctx, viewport, currentPrice: liveCandle.close, width, height, digits });
  }
}
