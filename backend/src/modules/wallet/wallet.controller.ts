/**
 * Wallet controller - handles HTTP requests
 * 🔥 FLOW W1: Deposit endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { DepositService } from '../../domain/finance/DepositService.js';
import { PrismaAccountRepository } from '../../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from '../../infrastructure/prisma/PrismaTransactionRepository.js';
import { logger } from '../../shared/logger.js';

export class WalletController {
  private depositService: DepositService;

  constructor() {
    const accountRepository = new PrismaAccountRepository();
    const transactionRepository = new PrismaTransactionRepository();
    this.depositService = new DepositService(accountRepository, transactionRepository);
  }

  /**
   * POST /api/wallet/deposit
   * Create deposit transaction
   */
  async deposit(
    request: FastifyRequest<{
      Body: {
        amount: number;
        paymentMethod: 'CARD' | 'CRYPTO' | 'BANK';
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const { amount, paymentMethod } = request.body;

      const transaction = await this.depositService.deposit({
        userId,
        amount,
        paymentMethod,
      });

      return reply.send({
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
      });
    } catch (error) {
      logger.error('Deposit error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Minimum deposit')) {
          return reply.status(400).send({
            error: 'Invalid amount',
            message: error.message,
          });
        }
        return reply.status(400).send({
          error: error.message,
        });
      }
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/wallet/balance
   * Get REAL account balance (calculated from transactions)
   */
  async getBalance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId;
      if (!userId) {
        return reply.status(401).send({
          error: 'Not authenticated',
        });
      }

      const accountRepository = new PrismaAccountRepository();
      const transactionRepository = new PrismaTransactionRepository();

      // Get or create REAL account
      const account = await accountRepository.getRealAccount(userId);

      // 🔥 FLOW W1: Balance считается из транзакций
      const balance = await transactionRepository.getBalance(account.id);

      return reply.send({
        currency: account.currency,
        balance,
      });
    } catch (error) {
      logger.error('Get balance error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }
}
