/**
 * marketCountdown.ts - pure функция для расчета countdown до открытия рынка
 * 
 * FLOW C-MARKET-COUNTDOWN: Таймер обратного отсчета
 */

export interface MarketCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Вычисляет разницу времени до целевого момента
 * 
 * @param now - текущее время в миллисекундах (server time с учетом drift)
 * @param target - целевое время в миллисекундах (nextMarketOpenAt timestamp)
 * @returns объект с днями, часами, минутами и секундами
 */
export function getMarketCountdown(
  now: number,
  target: number
): MarketCountdown {
  const diff = Math.max(0, target - now);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}
