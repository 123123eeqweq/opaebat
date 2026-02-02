/**
 * renderMarketOverlay.ts - отрисовка оверлея "Market Closed"
 * 
 * FLOW C-MARKET-CLOSED: Overlay когда рынок закрыт
 * FLOW C-MARKET-COUNTDOWN: Таймер обратного отсчета
 */

export type MarketStatus = 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';

export interface MarketCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface RenderMarketOverlayParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  status: MarketStatus;
  countdown?: MarketCountdown; // FLOW C-MARKET-COUNTDOWN: таймер обратного отсчета
}

/**
 * Рисует оверлей "Market Closed" поверх графика
 */
export function renderMarketClosedOverlay({
  ctx,
  width,
  height,
  status,
  countdown,
}: RenderMarketOverlayParams): void {
  ctx.save();

  // Затемнение фона
  ctx.fillStyle = 'rgba(10, 15, 25, 0.75)';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Заголовок
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 18px Inter, system-ui, sans-serif';

  let title = 'Рынок закрыт';
  let subtitle = '';

  switch (status) {
    case 'WEEKEND':
      subtitle = countdown ? 'Торги возобновятся через' : 'Торги недоступны в выходные';
      break;

    case 'HOLIDAY':
      subtitle = countdown ? 'Торги возобновятся через' : 'Торги возобновятся скоро';
      break;

    case 'MAINTENANCE':
      subtitle = countdown ? 'Торги возобновятся через' : 'Идёт обновление торговых систем';
      break;

    case 'OPEN':
      // Не должно вызываться для OPEN статуса
      ctx.restore();
      return;
  }

  const blockOffsetY = -100; // Смещение всего блока вверх

  ctx.fillText(title, width / 2, height / 2 - 30 + blockOffsetY);

  // Подзаголовок
  ctx.font = '400 14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#9aa4b2';
  ctx.fillText(subtitle, width / 2, height / 2 - 6 + blockOffsetY);

  // FLOW C-MARKET-COUNTDOWN: Таймер обратного отсчета
  if (countdown) {
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#4ade80'; // Зеленый цвет для таймера

    // Форматируем текст таймера
    let text = '';
    if (countdown.days > 0) {
      text = `${countdown.days} д ${countdown.hours} ч ${countdown.minutes} мин`;
    } else {
      text = `${countdown.hours} ч ${countdown.minutes} мин ${countdown.seconds} с`;
    }

    ctx.fillText(text, width / 2, height / 2 + 26 + blockOffsetY);
  }

  ctx.restore();
}
