/**
 * Accounts routes
 */

import type { FastifyInstance } from 'fastify';
import { AccountService } from '../../domain/accounts/AccountService.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { AccountsController } from './accounts.controller.js';
import { getAccountsSchema, createAccountSchema, switchAccountSchema } from './accounts.schema.js';
import { requireAuth } from '../auth/auth.middleware.js';

export async function registerAccountsRoutes(app: FastifyInstance) {
  // Initialize dependencies
  const accountRepository = new PrismaAccountRepository();
  const accountService = new AccountService(accountRepository);
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
}
