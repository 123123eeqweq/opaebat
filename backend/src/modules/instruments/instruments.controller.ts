/**
 * InstrumentsController — обработка HTTP запросов для инструментов
 * 🔥 FLOW I-PAYOUT: Возвращаем payoutPercent
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaInstrumentRepository } from '../../infrastructure/prisma/PrismaInstrumentRepository.js';
import { INSTRUMENTS } from '../../config/instruments.js';

export class InstrumentsController {
  private instrumentRepository: PrismaInstrumentRepository;

  constructor() {
    this.instrumentRepository = new PrismaInstrumentRepository();
  }

  async getInstruments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const instruments = await this.instrumentRepository.findAll();

      // Форматируем ответ для фронта
      const response = instruments.map((inst) => ({
        id: inst.id,
        name: `${inst.base} / ${inst.quote}`,
        base: inst.base,
        quote: inst.quote,
        digits: inst.digits,
        payoutPercent: inst.payoutPercent ?? 75,
      }));

      return reply.send(response);
    } catch (error: any) {
      request.log.error('Get instruments error:', error);
      return reply.status(500).send({ error: 'Failed to get instruments' });
    }
  }

  async updatePayout(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { payoutPercent: number };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { payoutPercent } = request.body;

      // Проверяем, что инструмент существует в конфиге
      if (!INSTRUMENTS[id]) {
        return reply.status(404).send({ error: 'Instrument not found' });
      }

      await this.instrumentRepository.updatePayout(id, payoutPercent);

      return reply.send({ success: true });
    } catch (error: any) {
      request.log.error('Update payout error:', error);
      if (error.message?.includes('Invalid payout percent')) {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Failed to update payout' });
    }
  }
}
