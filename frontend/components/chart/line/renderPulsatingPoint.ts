/**
 * renderPulsatingPoint - рендеринг пульсирующей точки на линейном графике
 * 
 * Рисует яркий кружок с эффектом пульсации и свечения на последней точке линии
 */

interface RenderPulsatingPointParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  /** Время для анимации пульсации (performance.now() или Date.now()) */
  time: number;
  /** Радиус основного кружка */
  radius?: number;
}

const POINT_COLOR = '#00d4ff'; // Яркий циан-синий
const GLOW_COLOR = 'rgba(0, 212, 255, 0.4)'; // Полупрозрачный для свечения
const PULSE_DURATION = 2000; // Длительность одного пульса (2 секунды)

/**
 * Рендерит пульсирующую точку с эффектом свечения
 */
export function renderPulsatingPoint({
  ctx,
  x,
  y,
  time,
  radius = 4,
}: RenderPulsatingPointParams): void {
  ctx.save();

  // Вычисляем фазу пульсации (0..1)
  const pulsePhase = (time % PULSE_DURATION) / PULSE_DURATION;
  
  // Синусоидальная функция для плавной пульсации (0..1)
  const pulseScale = 0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2);
  
  // Радиус внешнего свечения (пульсирует)
  const glowRadius = radius + pulseScale * 8; // От radius до radius + 8
  
  // Прозрачность свечения (пульсирует)
  const glowOpacity = 0.3 + pulseScale * 0.2; // От 0.3 до 0.5

  // Рисуем внешнее свечение (пульсирующий halo)
  const gradient = ctx.createRadialGradient(x, y, radius, x, y, glowRadius);
  gradient.addColorStop(0, `rgba(0, 212, 255, ${glowOpacity})`);
  gradient.addColorStop(0.5, `rgba(0, 212, 255, ${glowOpacity * 0.5})`);
  gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Рисуем основной яркий кружок
  ctx.fillStyle = POINT_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Добавляем небольшой блик для объема
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
