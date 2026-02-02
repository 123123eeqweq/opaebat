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
  DemoResetNotAllowedError,
  DemoAccountNotFoundError,
} from '../../domain/accounts/AccountErrors.js';
import { AccountType } from '../../domain/accounts/AccountTypes.js';
import { logger } from '../../shared/logger.js';
import { emitAccountSnapshot } from '../../bootstrap/websocket.bootstrap.js';

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

      // 🔥 FLOW A-ACCOUNT: Emit account snapshot via WebSocket
      try {
        const snapshot = await this.accountService.getAccountSnapshot(userId);
        if (snapshot) {
          emitAccountSnapshot(userId, snapshot);
        }
      } catch (error) {
        logger.error('Failed to emit account snapshot after switch:', error);
        // Don't fail the request if WS fails
      }

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

  /**
   * 🔥 FLOW A-ACCOUNT: Get account snapshot
   */
  async getAccountSnapshot(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware

      const snapshot = await this.accountService.getAccountSnapshot(userId);

      if (!snapshot) {
        return reply.status(404).send({
          error: 'No active account found',
        });
      }

      return reply.send(snapshot);
    } catch (error) {
      logger.error('Get account snapshot error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * 🔥 FLOW D-RESET-DEMO: Reset demo account balance
   */
  async resetDemoAccount(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware

      logger.info(`Reset demo account requested for user: ${userId}`);
      const account = await this.accountService.resetDemoAccount(userId);

      // 🔥 FLOW A-ACCOUNT: Emit account snapshot via WebSocket
      try {
        const snapshot = await this.accountService.getAccountSnapshot(userId);
        if (snapshot) {
          emitAccountSnapshot(userId, snapshot);
        }
      } catch (error) {
        logger.error('Failed to emit account snapshot after reset:', error);
        // Don't fail the request if WS fails
      }

      return reply.send({
        account: {
          id: account.id,
          balance: account.balance,
          currency: account.currency,
          type: account.type,
        },
      });
    } catch (error) {
      if (error instanceof DemoAccountNotFoundError) {
        logger.warn(`Demo account not found for user: ${request.userId}`);
        return reply.status(404).send({
          error: 'Demo account not found',
          message: error.message,
        });
      }

      if (error instanceof DemoResetNotAllowedError) {
        logger.warn(`Demo reset not allowed for user: ${request.userId} - balance too high`);
        return reply.status(400).send({
          error: 'Demo reset not allowed',
          message: error.message,
        });
      }

      logger.error('Reset demo account error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }
}
