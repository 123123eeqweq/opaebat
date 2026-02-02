/**
 * FLOW L-UI: Унифицированный интерфейс Viewport для UI-рендеринга
 * 
 * Используется для:
 * - renderGrid
 * - renderCrosshair
 * - renderPriceLine
 * - renderBackground
 * 
 * И candle viewport, и line viewport должны его реализовывать.
 */

export interface TimePriceViewport {
  timeStart: number;
  timeEnd: number;
  priceMin: number;
  priceMax: number;
}
