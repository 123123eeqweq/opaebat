/**
 * Transaction repository port (interface)
 * 🔥 FLOW W1: Deposit/Withdrawal transactions
 */

import type { Transaction, CreateTransactionDto } from '../../domain/finance/TransactionTypes.js';

export interface TransactionRepository {
  create(data: CreateTransactionDto): Promise<Transaction>;
  confirm(transactionId: string): Promise<void>;
  getBalance(accountId: string): Promise<number>;
  findById(transactionId: string): Promise<Transaction | null>;
  findByAccountId(accountId: string): Promise<Transaction[]>;
  /** CONFIRMED transactions before date (for initial balance calc) */
  findConfirmedByAccountIdBefore(accountId: string, beforeDate: Date): Promise<Transaction[]>;
  /** CONFIRMED transactions in date range (for daily balance changes) */
  findConfirmedByAccountIdInDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]>;
}
