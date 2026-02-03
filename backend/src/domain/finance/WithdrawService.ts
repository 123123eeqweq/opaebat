/**
 * Withdraw domain service - pure business logic
 * 🔥 FLOW W1: Withdraw transactions
 */

import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import { TransactionType, TransactionStatus, PaymentMethod } from './TransactionTypes.js';
import { logger } from '../../shared/logger.js';

export class WithdrawService {
  constructor(
    private accountRepository: AccountRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async withdraw({
    userId,
    amount,
    paymentMethod,
  }: {
    userId: string;
    amount: number;
    paymentMethod: string;
  }) {
    if (amount < 200 || amount > 1000) {
      throw new Error('Сумма вывода: от 200 до 1000 ₴');
    }

    const account = await this.accountRepository.getRealAccount(userId);
    const balance = await this.transactionRepository.getBalance(account.id);

    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    const transaction = await this.transactionRepository.create({
      userId,
      accountId: account.id,
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.PENDING,
      amount: -amount,
      currency: 'UAH',
      paymentMethod: paymentMethod as PaymentMethod,
      provider: 'manual',
    });

    await this.transactionRepository.confirm(transaction.id);

    // Sync Account.balance so it matches transaction-based balance
    await this.accountRepository.updateBalance(account.id, -amount);

    logger.info(`Withdraw created: userId=${userId}, amount=${amount}, transactionId=${transaction.id}`);

    const confirmed = await this.transactionRepository.findById(transaction.id);
    if (!confirmed) throw new Error('Failed to retrieve confirmed transaction');

    return { ...confirmed, amount: Math.abs(confirmed.amount) };
  }
}
