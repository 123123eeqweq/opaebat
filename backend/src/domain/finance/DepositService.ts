/**
 * Deposit domain service - pure business logic
 * 🔥 FLOW W1: Deposit transactions
 */

import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import { TransactionType, TransactionStatus, PaymentMethod } from './TransactionTypes.js';
import { logger } from '../../shared/logger.js';

export class DepositService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  /**
   * 🔥 FLOW W1: Create deposit transaction
   * Balance is calculated from transactions, not stored directly
   */
  async deposit({
    userId,
    amount,
    paymentMethod,
  }: {
    userId: string;
    amount: number;
    paymentMethod: 'CARD' | 'CRYPTO' | 'BANK';
  }) {
    // Validation: minimum deposit
    if (amount < 10) {
      throw new Error('Minimum deposit is $10');
    }

    // Get or create REAL account
    const account = await this.accountRepository.getRealAccount(userId);

    // Create transaction (PENDING)
    const transaction = await this.transactionRepository.create({
      userId,
      accountId: account.id,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      amount,
      currency: 'USD',
      paymentMethod: paymentMethod as PaymentMethod,
      provider: 'manual', // 🔥 MOCK: пока без реальных платёжек
    });

    // 🔥 MOCK подтверждение (ПОКА ЧТО)
    // В будущем здесь будет интеграция с Stripe/Crypto/Bank
    await this.transactionRepository.confirm(transaction.id);

    logger.info(`Deposit created: userId=${userId}, amount=${amount}, transactionId=${transaction.id}`);

    // Return confirmed transaction
    const confirmedTransaction = await this.transactionRepository.findById(transaction.id);
    if (!confirmedTransaction) {
      throw new Error('Failed to retrieve confirmed transaction');
    }

    return confirmedTransaction;
  }
}
