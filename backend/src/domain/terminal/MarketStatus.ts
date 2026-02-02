/**
 * Market Status - статус рынка
 * 
 * FLOW C-MARKET-CLOSED: Определение статуса рынка
 * FLOW C-MARKET-COUNTDOWN: Таймер до открытия рынка
 * FLOW C-MARKET-ALTERNATIVES: Альтернативные пары с наибольшей доходностью
 */

import { getInstrumentOrDefault, INSTRUMENTS } from '../../config/instruments.js';

export type MarketStatus = 'OPEN' | 'WEEKEND' | 'MAINTENANCE' | 'HOLIDAY';

export interface MarketAlternative {
  instrumentId: string;
  label: string;
  payout: number;
}

export interface MarketStatusResult {
  marketOpen: boolean;
  marketStatus: MarketStatus;
  nextMarketOpenAt: string | null; // ISO string UTC timestamp
  topAlternatives: MarketAlternative[]; // FLOW C-MARKET-ALTERNATIVES: топ-5 пар с наибольшей доходностью
}

/**
 * Вычисляет время следующего открытия рынка для FX инструментов
 * FX рынок открывается в понедельник 00:00 UTC
 * 
 * @param currentTime - текущее время в миллисекундах
 * @returns timestamp следующего понедельника 00:00 UTC
 */
function getNextMarketOpenTime(currentTime: number): number {
  const date = new Date(currentTime);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Вычисляем количество дней до следующего понедельника
  // Понедельник = 1, поэтому:
  // - Воскресенье (0): через 1 день
  // - Суббота (6): через 2 дня
  let daysUntilMonday: number;
  if (dayOfWeek === 0) {
    daysUntilMonday = 1; // Воскресенье -> понедельник через 1 день
  } else if (dayOfWeek === 6) {
    daysUntilMonday = 2; // Суббота -> понедельник через 2 дня
  } else {
    // Это не должно происходить для WEEKEND статуса, но на всякий случай
    // Вычисляем до следующего понедельника: (8 - dayOfWeek) % 7
    // Понедельник (1): (8-1)%7 = 7 дней
    // Вторник (2): (8-2)%7 = 6 дней
    // ...
    // Пятница (5): (8-5)%7 = 3 дня
    daysUntilMonday = (8 - dayOfWeek) % 7;
  }

  // Создаем дату следующего понедельника 00:00 UTC
  const nextMonday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0
  ));

  return nextMonday.getTime();
}

/**
 * Получает топ-5 альтернативных инструментов с наибольшей доходностью
 * Исключает текущий инструмент из списка
 * 
 * FLOW C-MARKET-ALTERNATIVES: Список альтернативных пар
 */
function getTopAlternatives(
  currentInstrumentId: string,
  limit: number = 5
): MarketAlternative[] {
  // Получаем все инструменты с их доходностью
  const alternatives: MarketAlternative[] = Object.values(INSTRUMENTS)
    .filter((inst) => inst.id !== currentInstrumentId) // Исключаем текущий инструмент
    .map((inst) => {
      // Формируем label: "EUR/USD OTC" или "BTC/USD"
      const label = inst.source === 'otc'
        ? `${inst.base}/${inst.quote} OTC`
        : `${inst.base}/${inst.quote}`;

      // Используем payoutPercent из конфигурации или дефолтное значение
      // Дефолтные значения: OTC = 90%, крипта = 88%, FX real = 85%
      let payout = inst.payoutPercent ?? 75;
      if (inst.source === 'otc') {
        payout = inst.payoutPercent ?? 90;
      } else if (inst.base === 'BTC' || inst.base === 'ETH' || inst.base === 'SOL' || inst.base === 'BNB') {
        payout = inst.payoutPercent ?? 88;
      } else {
        payout = inst.payoutPercent ?? 85;
      }

      return {
        instrumentId: inst.id,
        label,
        payout,
      };
    })
    .sort((a, b) => b.payout - a.payout) // Сортируем по убыванию доходности
    .slice(0, limit); // Берем топ-N

  return alternatives;
}

/**
 * Определяет статус рынка на основе типа инструмента и текущего времени
 * 
 * Правила:
 * - OTC инструменты: всегда открыты
 * - FX инструменты: закрыты в выходные (суббота и воскресенье)
 * - Можно расширить для maintenance/holidays
 */
export function getMarketStatus(
  instrumentSource: 'otc' | 'real',
  currentInstrumentId: string,
  currentTime: number = Date.now()
): MarketStatusResult {
  // Получаем топ-5 альтернативных пар (всегда, даже если рынок открыт)
  const topAlternatives = getTopAlternatives(currentInstrumentId, 5);

  // OTC инструменты всегда открыты
  if (instrumentSource === 'otc') {
    return {
      marketOpen: true,
      marketStatus: 'OPEN',
      nextMarketOpenAt: null,
      topAlternatives,
    };
  }

  // FX (real) инструменты закрыты в выходные
  const date = new Date(currentTime);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const nextOpenTime = getNextMarketOpenTime(currentTime);
    return {
      marketOpen: false,
      marketStatus: 'WEEKEND',
      nextMarketOpenAt: new Date(nextOpenTime).toISOString(),
      topAlternatives,
    };
  }

  // В будние дни рынок открыт
  return {
    marketOpen: true,
    marketStatus: 'OPEN',
    nextMarketOpenAt: null,
    topAlternatives,
  };
}
