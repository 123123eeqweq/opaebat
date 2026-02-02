/**
 * FLOW LP-1 + R-LINE-2: PricePointWriter
 * 
 * Записывает 1 price point в секунду для каждого инструмента.
 * Используется для истории линейного графика.
 * 
 * FLOW R-LINE-1: Использует instrumentId как ключ (унифицированный для OTC и REAL)
 */

import { getPrismaClient } from '../bootstrap/database.js';
import { logger } from '../shared/logger.js';
import type { PriceTick } from './PriceTypes.js';

export class PricePointWriter {
  // Map<instrumentId, lastSecondTimestamp>
  // FLOW R-LINE-1: instrumentId используется напрямую (не symbol)
  private lastSecond = new Map<string, number>();

  /**
   * Обработать тик и записать price point, если началась новая секунда
   * 
   * @param instrumentId - ID инструмента (EURUSD, EURUSD_REAL, и т.д.)
   * @param price - Цена
   * @param time - Timestamp (уже нормализован к server-time для REAL)
   */
  async handleTick(instrumentId: string, price: number, time: number): Promise<void> {
    // FLOW R-LINE-2: Округляем до начала секунды (1 точка в секунду)
    const second = Math.floor(time / 1000) * 1000;
    const last = this.lastSecond.get(instrumentId);

    // Если это та же секунда — пропускаем
    if (last === second) {
      return;
    }

    // Обновляем последнюю секунду
    this.lastSecond.set(instrumentId, second);

    // Проверяем, что модель доступна (если Prisma Client не был перегенерирован)
    const prisma = getPrismaClient();
    if (!('pricePoint' in prisma)) {
      // Только первое предупреждение, чтобы не спамить логи
      if (!this.lastSecond.has('_model_warned')) {
        logger.warn(`[PricePointWriter] PricePoint model not available. Run 'npx prisma generate' to regenerate Prisma Client.`);
        this.lastSecond.set('_model_warned', 1);
      }
      return;
    }

    try {
      // FLOW R-LINE-1: Используем instrumentId как symbol в БД (унифицированный ключ)
      // Upsert: обновить если существует, создать если нет
      await (prisma as any).pricePoint.upsert({
        where: {
          symbol_timestamp: {
            symbol: instrumentId, // symbol = instrumentId в БД
            timestamp: BigInt(second),
          },
        },
        update: {
          price: price,
        },
        create: {
          symbol: instrumentId, // symbol = instrumentId в БД
          timestamp: BigInt(second),
          price: price,
        },
      });
    } catch (error: any) {
      // Логируем ошибку, но не прерываем работу
      // Игнорируем ошибки, связанные с отсутствием таблицы (миграция еще не выполнена)
      const errorMessage = error?.message || String(error);
      
      if (
        errorMessage.includes('does not exist') ||
        errorMessage.includes('table') && errorMessage.includes('price_points')
      ) {
        // Только первое предупреждение, чтобы не спамить логи
        if (!this.lastSecond.has('_table_warned')) {
          logger.debug(`[PricePointWriter] Table price_points does not exist yet. Migration needed. Skipping price point writes for now.`);
          this.lastSecond.set('_table_warned', 1);
        }
        return;
      }
      
      // Для других ошибок логируем только раз в минуту, чтобы не спамить
      const errorKey = `_error_${instrumentId}`;
      const lastErrorTime = this.lastSecond.get(errorKey) || 0;
      const now = Date.now();
      
      if (now - lastErrorTime > 60000) { // Раз в минуту
        logger.error(`[PricePointWriter] Failed to write price point for ${instrumentId}:`, errorMessage);
        this.lastSecond.set(errorKey, now);
      }
    }
  }

  /**
   * Очистить кеш последней секунды (для тестирования)
   */
  clearCache(): void {
    this.lastSecond.clear();
  }
}
