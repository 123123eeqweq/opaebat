/**
 * InstrumentRepository — интерфейс для работы с инструментами
 * 🔥 FLOW I-PAYOUT: Добавлен payoutPercent
 */

import type { Instrument } from '../../domain/instruments/InstrumentTypes.js';

export interface InstrumentRepository {
  findAll(): Promise<Instrument[]>;
  findById(id: string): Promise<Instrument | null>;
  // 🔥 FLOW I-PAYOUT: Обновление доходности
  updatePayout(id: string, payoutPercent: number): Promise<void>;
}
