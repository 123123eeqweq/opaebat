/**
 * FLOW BO-HOVER: Рендеринг подсветки зоны при наведении на кнопки CALL/PUT
 * 
 * Presentation-only overlay:
 * - CALL: зелёный градиент ВЫШЕ текущей цены
 * - PUT: красный градиент НИЖЕ текущей цены
 */

export type HoverAction = 'CALL' | 'PUT' | null;

interface RenderHoverHighlightParams {
  ctx: CanvasRenderingContext2D;
  hoverAction: HoverAction;
  priceY: number; // Y координата текущей цены
  width: number;
  height: number;
  /** FLOW BO-HOVER-ARROWS: изображения стрелок (опционально) */
  arrowUpImg?: HTMLImageElement | null;
  arrowDownImg?: HTMLImageElement | null;
  /** FLOW BO-HOVER-ARROWS: X координата последней свечи/точки (для позиционирования стрелки рядом с данными) */
  lastDataPointX?: number | null;
}

const ARROW_SIZE = 28; // px
const ARROW_X_OFFSET_FROM_DATA = 55; // Отступ от последней свечи/точки (справа)
const ARROW_Y_OFFSET = 8; // Отступ от линии цены
const ARROW_ROTATION_ANGLE = Math.PI / 8; // 22.5 градусов поворота (в радианах)

/**
 * Рендерит подсветку зоны при наведении на кнопки CALL/PUT
 */
export function renderHoverHighlight({
  ctx,
  hoverAction,
  priceY,
  width,
  height,
  arrowUpImg,
  arrowDownImg,
  lastDataPointX,
}: RenderHoverHighlightParams): void {
  if (!hoverAction || priceY < 0 || priceY > height) {
    return;
  }

  ctx.save();

  if (hoverAction === 'CALL') {
    // CALL: зелёный градиент ВЫШЕ цены
    const gradient = ctx.createLinearGradient(0, 0, 0, priceY);
    gradient.addColorStop(0, 'rgba(34,197,94,0.15)'); // Зелёный сверху
    gradient.addColorStop(1, 'rgba(34,197,94,0.02)'); // Почти прозрачный у цены

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, priceY);

    // Лёгкая пунктирная линия текущей цены
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, priceY);
    ctx.lineTo(width, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // FLOW BO-HOVER-ARROWS: стрелка вверх (CALL) - рядом с последней свечой/точкой
    if (arrowUpImg?.complete) {
      // Позиционируем стрелку справа от последней свечи/точки, если есть координата
      // Иначе используем правый край (fallback)
      const x = lastDataPointX != null && lastDataPointX > 0
        ? lastDataPointX + ARROW_X_OFFSET_FROM_DATA
        : width - ARROW_SIZE - 16; // Fallback: от правого края
      
      const y = priceY - ARROW_SIZE - ARROW_Y_OFFSET;
      
      // Проверяем, что стрелка видна (не выходит за границы)
      if (x >= 0 && x + ARROW_SIZE <= width && y >= 0 && y + ARROW_SIZE <= height) {
        // Центр стрелки для поворота
        const centerX = x + ARROW_SIZE / 2;
        const centerY = y + ARROW_SIZE / 2;
        
        ctx.globalAlpha = 0.9;
        ctx.translate(centerX, centerY);
        ctx.rotate(-ARROW_ROTATION_ANGLE); // Поворачиваем вверх (отрицательный угол = против часовой)
        ctx.drawImage(arrowUpImg, -ARROW_SIZE / 2, -ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE);
        ctx.rotate(ARROW_ROTATION_ANGLE); // Возвращаем поворот
        ctx.translate(-centerX, -centerY); // Возвращаем начало координат
        ctx.globalAlpha = 1;
      }
    }
  } else if (hoverAction === 'PUT') {
    // PUT: красный градиент НИЖЕ цены
    const gradient = ctx.createLinearGradient(0, priceY, 0, height);
    gradient.addColorStop(0, 'rgba(239,68,68,0.15)'); // Красный у цены
    gradient.addColorStop(1, 'rgba(239,68,68,0.02)'); // Почти прозрачный снизу

    ctx.fillStyle = gradient;
    ctx.fillRect(0, priceY, width, height - priceY);

    // Лёгкая пунктирная линия текущей цены
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, priceY);
    ctx.lineTo(width, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // FLOW BO-HOVER-ARROWS: стрелка вниз (PUT) - рядом с последней свечой/точкой
    if (arrowDownImg?.complete) {
      // Позиционируем стрелку справа от последней свечи/точки, если есть координата
      // Иначе используем правый край (fallback)
      const x = lastDataPointX != null && lastDataPointX > 0
        ? lastDataPointX + ARROW_X_OFFSET_FROM_DATA
        : width - ARROW_SIZE - 16; // Fallback: от правого края
      
      const y = priceY + ARROW_Y_OFFSET;
      
      // Проверяем, что стрелка видна (не выходит за границы)
      if (x >= 0 && x + ARROW_SIZE <= width && y >= 0 && y + ARROW_SIZE <= height) {
        // Центр стрелки для поворота
        const centerX = x + ARROW_SIZE / 2;
        const centerY = y + ARROW_SIZE / 2;
        
        ctx.globalAlpha = 0.9;
        ctx.translate(centerX, centerY);
        ctx.rotate(ARROW_ROTATION_ANGLE); // Поворачиваем вниз (положительный угол = по часовой)
        ctx.drawImage(arrowDownImg, -ARROW_SIZE / 2, -ARROW_SIZE / 2, ARROW_SIZE, ARROW_SIZE);
        ctx.rotate(-ARROW_ROTATION_ANGLE); // Возвращаем поворот
        ctx.translate(-centerX, -centerY); // Возвращаем начало координат
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.restore();
}
