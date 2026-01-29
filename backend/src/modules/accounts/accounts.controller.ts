/**
 * Accounts controller - handles HTTP requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { AccountService } from '../../domain/accounts/AccountService.js';
import {
  AccountNotFoundError,
  AccountAlreadyExistsError,
  InvalidAccountTypeError,
  UnauthorizedAccountAccessError,
} from '../../domain/accounts/AccountErrors.js';
import { AccountType } from '../../domain/accounts/AccountTypes.js';
import { logger } from '../../shared/logger.js';

export class AccountsController {
  constructor(private accountService: AccountService) {}

  async getAccounts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware

      const accounts = await this.accountService.getAccounts(userId);

      return reply.send({
        accounts,
      });
    } catch (error) {
      logger.error('Get accounts error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async createAccount(
    request: FastifyRequest<{ Body: { type: 'demo' | 'real' } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware
      const { type } = request.body;

      const account = await this.accountService.createAccount({
        userId,
        type: type === 'demo' ? AccountType.DEMO : AccountType.REAL,
      });

      return reply.status(201).send({
        account,
      });
    } catch (error) {
      if (error instanceof AccountAlreadyExistsError) {
        return reply.status(409).send({
          error: 'Account already exists',
          message: error.message,
        });
      }

      if (error instanceof InvalidAccountTypeError) {
        return reply.status(400).send({
          error: 'Invalid account type',
          message: error.message,
        });
      }

      logger.error('Create account error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async switchAccount(
    request: FastifyRequest<{ Body: { accountId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware
      const { accountId } = request.body;

      const account = await this.accountService.setActiveAccount(userId, accountId);

      return reply.send({
        account,
      });
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        return reply.status(404).send({
          error: 'Account not found',
          message: error.message,
        });
      }

      if (error instanceof UnauthorizedAccountAccessError) {
        return reply.status(403).send({
          error: 'Unauthorized access',
          message: error.message,
        });
      }

      logger.error('Switch account error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }
}
