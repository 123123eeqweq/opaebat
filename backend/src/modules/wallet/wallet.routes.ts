/**
 * Wallet routes
 * 🔥 FLOW W1: Deposit endpoints
 */

import type { FastifyInstance } from 'fastify';
import { WalletController } from './wallet.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { depositSchema, getBalanceSchema } from './wallet.schema.js';

export async function registerWalletRoutes(app: FastifyInstance) {
  const walletController = new WalletController();

  // POST /api/wallet/deposit
  app.post(
    '/api/wallet/deposit',
    {
      schema: depositSchema,
      preHandler: [requireAuth],
    },
    (request, reply) => walletController.deposit(request, reply),
  );

  // GET /api/wallet/balance
  app.get(
    '/api/wallet/balance',
    {
      schema: getBalanceSchema,
      preHandler: [requireAuth],
    },
    (request, reply) => walletController.getBalance(request, reply),
  );
}
