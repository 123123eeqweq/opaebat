/**
 * FLOW L-UI: Render Background - фон графика
 * 
 * Используется и для свечного, и для линейного графика.
 * Цвет фона соответствует цвету страницы терминала (#061230).
 */

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#061230'; // Тот же цвет, что у свечного графика и страницы терминала
  ctx.fillRect(0, 0, width, height);
}
