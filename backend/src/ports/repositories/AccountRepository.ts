/**
 * Account repository port (interface)
 */

import type { Account } from '../../domain/accounts/AccountTypes.js';

export interface AccountRepository {
  findByUserId(userId: string): Promise<Account[]>;
  findActiveByUserId(userId: string): Promise<Account | null>;
  findByUserIdAndType(userId: string, type: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  create(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account>;
  setActive(userId: string, accountId: string): Promise<void>;
  updateBalance(accountId: string, delta: number): Promise<Account>;
}
