/**
 * Instruments routes — маршруты для работы с инструментами
 * 🔥 FLOW I-PAYOUT: Endpoint для получения инструментов с payoutPercent
 */

import type { FastifyInstance } from 'fastify';
import { InstrumentsController } from './instruments.controller.js';
import { getInstrumentsSchema, updatePayoutSchema } from './instruments.schema.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';

export async function registerInstrumentsRoutes(app: FastifyInstance) {
  const instrumentsController = new InstrumentsController();

  // GET /api/instruments — получить все инструменты с payoutPercent
  app.get(
    '/api/instruments',
    { schema: getInstrumentsSchema },
    (request, reply) => instrumentsController.getInstruments(request, reply)
  );

  // PATCH /api/instruments/:id/payout — обновить доходность (только для админов)
  app.patch(
    '/api/instruments/:id/payout',
    { schema: updatePayoutSchema, preHandler: [requireAuth, requireAdmin] },
    (request, reply) => instrumentsController.updatePayout(request as any, reply)
  );
}
