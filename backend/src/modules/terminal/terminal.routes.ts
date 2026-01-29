/**
 * Terminal routes
 * FLOW P4: snapshot/candles use instrument; adapter uses PriceEngineManager
 */

import type { FastifyInstance } from 'fastify';
import { TerminalSnapshotService } from '../../domain/terminal/TerminalSnapshotService.js';
import { TerminalSnapshotAdapter } from '../../infrastructure/terminal/TerminalSnapshotAdapter.js';
import { PrismaUserRepository } from '../../infrastructure/prisma/PrismaUserRepository.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTradeRepository } from '../../infrastructure/prisma/PrismaTradeRepository.js';
import { SystemClock } from '../../infrastructure/time/SystemClock.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { TerminalController } from './terminal.controller.js';
import { getSnapshotSchema } from './terminal.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerTerminalRoutes(app: FastifyInstance) {
  const userRepository = new PrismaUserRepository();
  const accountRepository = new PrismaAccountRepository();
  const tradeRepository = new PrismaTradeRepository();

  const getManager = () => getPriceEngineManager();

  const clock = new SystemClock();
  const snapshotAdapter = new TerminalSnapshotAdapter(
    userRepository,
    accountRepository,
    tradeRepository,
    getManager,
    clock,
  );

  const snapshotService = new TerminalSnapshotService(snapshotAdapter);
  const terminalController = new TerminalController(snapshotService, getManager);

  app.get(
    '/api/terminal/snapshot',
    {
      schema: getSnapshotSchema,
      preHandler: requireAuth,
    },
    (request, reply) => terminalController.getSnapshot(request, reply),
  );

  app.get(
    '/api/quotes/candles',
    {
      preHandler: requireAuth,
    },
    (request, reply) => terminalController.getCandles(request, reply),
  );
}
