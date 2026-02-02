/**
 * PrismaInstrumentRepository — реализация InstrumentRepository через Prisma
 * 🔥 FLOW I-PAYOUT: Работа с payoutPercent
 */

import { getPrismaClient } from '../../bootstrap/database.js';
import type { InstrumentRepository } from '../../ports/repositories/InstrumentRepository.js';
import type { Instrument } from '../../domain/instruments/InstrumentTypes.js';
import { INSTRUMENTS } from '../../config/instruments.js';

export class PrismaInstrumentRepository implements InstrumentRepository {
  async findAll(): Promise<Instrument[]> {
    const prisma = getPrismaClient();
    // Получаем все инструменты из БД (не только активные, чтобы покрыть все из конфига)
    const dbInstruments = await prisma.instrument.findMany();

    // Объединяем данные из БД с конфигом
    // Возвращаем все инструменты из конфига, даже если их нет в БД
    return Object.values(INSTRUMENTS).map((config) => {
      const dbInst = dbInstruments.find((db) => db.id === config.id);
      return {
        id: config.id,
        base: config.base,
        quote: config.quote,
        digits: config.digits,
        payoutPercent: dbInst?.payoutPercent ?? 75, // Дефолт 75% если нет в БД
      };
    });
  }

  async findById(id: string): Promise<Instrument | null> {
    const config = INSTRUMENTS[id];
    if (!config) return null;

    const prisma = getPrismaClient();
    const dbInst = await prisma.instrument.findUnique({
      where: { id },
    });

    return {
      id: config.id,
      base: config.base,
      quote: config.quote,
      digits: config.digits,
      payoutPercent: dbInst?.payoutPercent ?? 75,
    };
  }

  // 🔥 FLOW I-PAYOUT: Обновление доходности
  async updatePayout(id: string, payoutPercent: number): Promise<void> {
    // Валидация: 60–90%
    if (payoutPercent < 60 || payoutPercent > 90) {
      throw new Error('Invalid payout percent. Must be between 60 and 90.');
    }

    const prisma = getPrismaClient();
    await prisma.instrument.upsert({
      where: { id },
      update: { payoutPercent },
      create: {
        id,
        name: `${INSTRUMENTS[id]?.base || ''} / ${INSTRUMENTS[id]?.quote || ''}`,
        base: INSTRUMENTS[id]?.base || '',
        quote: INSTRUMENTS[id]?.quote || '',
        payoutPercent,
      },
    });
  }
}
