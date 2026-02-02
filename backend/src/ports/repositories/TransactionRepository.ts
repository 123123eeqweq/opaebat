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
  findByAccountId(accountId: string): Promise<Transaction[]>; // 🔥 FLOW TRADE-STATS: Get all transactions for account
}
