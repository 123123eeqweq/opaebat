/**
 * timeframe.ts - утилиты для работы с timeframe
 */

/**
 * Парсит строку timeframe в миллисекунды
 * @param timeframe - строка формата "5s", "1m", "1h", "1d"
 * @returns количество миллисекунд
 */
export function parseTimeframeToMs(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([smhd])$/);
  if (!match) {
    // Дефолт 5 секунд если формат неверный
    return 5000;
  }

  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[match[2]] || 1000);
}
