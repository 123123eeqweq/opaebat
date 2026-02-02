/**
 * Accounts routes
 */

import type { FastifyInstance } from 'fastify';
import { AccountService } from '../../domain/accounts/AccountService.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from '../../infrastructure/prisma/PrismaTransactionRepository.js';
import { AccountsController } from './accounts.controller.js';
import { getAccountsSchema, createAccountSchema, switchAccountSchema, resetDemoAccountSchema, getAccountSnapshotSchema } from './accounts.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerAccountsRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const accountRepository = new PrismaAccountRepository();
  const transactionRepository = new PrismaTransactionRepository();
  const accountService = new AccountService(accountRepository, transactionRepository);
  const accountsController = new AccountsController(accountService);

  // Register routes with auth middleware
  app.get(
    '/api/accounts',
    {
      schema: getAccountsSchema,
      preHandler: requireAuth,
    },
    (request, reply) => accountsController.getAccounts(request, reply),
  );

  app.post(
    '/api/accounts/create',
    {
      schema: createAccountSchema,
      preHandler: requireAuth,
    },
    (request, reply) => accountsController.createAccount(request, reply),
  );

  app.post(
    '/api/accounts/switch',
    {
      schema: switchAccountSchema,
      preHandler: requireAuth,
    },
    (request, reply) => accountsController.switchAccount(request, reply),
  );

  app.post(
    '/api/accounts/demo/reset',
    {
      schema: resetDemoAccountSchema,
      preHandler: requireAuth,
    },
    (request, reply) => accountsController.resetDemoAccount(request, reply),
  );

  // 🔥 FLOW A-ACCOUNT: Get account snapshot endpoint
  app.get(
    '/api/account/snapshot',
    {
      schema: getAccountSnapshotSchema,
      preHandler: requireAuth,
    },
    (request, reply) => accountsController.getAccountSnapshot(request, reply),
  );
}
