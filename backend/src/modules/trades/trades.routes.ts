/**
 * Trades routes
 */

import type { FastifyInstance } from 'fastify';
import { TradeService } from '../../domain/trades/TradeService.js';
import { PrismaTradeRepository } from '../../infrastructure/prisma/PrismaTradeRepository.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { PriceServiceAdapter } from '../../infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from '../../bootstrap/prices.bootstrap.js';
import { TradesController } from './trades.controller.js';
import { openTradeSchema, getTradesSchema } from './trades.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerTradesRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const tradeRepository = new PrismaTradeRepository();
  const accountRepository = new PrismaAccountRepository();
  
  // Create lazy price provider wrapper
  // This will be initialized when first used (after bootstrap)
  let priceProvider: PriceServiceAdapter | null = null;
  const getPriceProvider = (): PriceServiceAdapter => {
    if (!priceProvider) {
      const manager = getPriceEngineManager();
      priceProvider = new PriceServiceAdapter(manager);
    }
    return priceProvider;
  };

  // Create price provider that uses lazy initialization
  const lazyPriceProvider: import('../../ports/pricing/PriceProvider.js').PriceProvider = {
    getCurrentPrice: async (asset: string) => {
      return getPriceProvider().getCurrentPrice(asset);
    },
  };

  const tradeService = new TradeService(tradeRepository, accountRepository, lazyPriceProvider);
  const tradesController = new TradesController(tradeService);

  // Register routes with auth middleware
  app.post(
    '/api/trades/open',
    {
      schema: openTradeSchema,
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.openTrade(request, reply),
  );

  app.get(
    '/api/trades',
    {
      schema: getTradesSchema,
      preHandler: requireAuth,
    },
    (request, reply) => tradesController.getTrades(request, reply),
  );
}
