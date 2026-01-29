/**
 * Test mocks - mock external dependencies
 */

import type { PriceProvider } from '../../src/ports/pricing/PriceProvider.js';
import type { AccountRepository } from '../../src/ports/repositories/AccountRepository.js';
import type { TradeRepository } from '../../src/ports/repositories/TradeRepository.js';
import type { Clock } from '../../src/domain/time/TimeTypes.js';
import type { Account } from '../../src/domain/accounts/AccountTypes.js';
import type { Trade } from '../../src/domain/trades/TradeTypes.js';
import { TradeStatus } from '../../src/domain/trades/TradeTypes.js';

/**
 * Mock PriceProvider
 */
export function mockPriceProvider(overrides?: Partial<PriceProvider>): PriceProvider {
  return {
    getCurrentPrice: async (asset: string) => {
      if (overrides?.getCurrentPrice) {
        return overrides.getCurrentPrice(asset);
      }
      return {
        price: 50000,
        timestamp: Date.now(),
      };
    },
  };
}

/**
 * Mock AccountRepository
 */
export function mockAccountRepository(overrides?: Partial<AccountRepository>): AccountRepository {
  const accounts = new Map<string, Account>();

  return {
    findByUserId: async (userId: string) => {
      if (overrides?.findByUserId) {
        return overrides.findByUserId(userId);
      }
      return Array.from(accounts.values()).filter((acc) => acc.userId === userId);
    },
    findActiveByUserId: async (userId: string) => {
      if (overrides?.findActiveByUserId) {
        return overrides.findActiveByUserId(userId);
      }
      return Array.from(accounts.values()).find((acc) => acc.userId === userId && acc.isActive) || null;
    },
    findById: async (id: string) => {
      if (overrides?.findById) {
        return overrides.findById(id);
      }
      return accounts.get(id) || null;
    },
    findByUserIdAndType: async (userId: string, type: string) => {
      if (overrides?.findByUserIdAndType) {
        return overrides.findByUserIdAndType(userId, type);
      }
      return Array.from(accounts.values()).find((acc) => acc.userId === userId && acc.type === type) || null;
    },
    create: async (account: Omit<Account, 'id' | 'createdAt'>) => {
      if (overrides?.create) {
        return overrides.create(account);
      }
      const newAccount: Account = {
        ...account,
        id: `account-${Date.now()}`,
        createdAt: new Date(),
      };
      accounts.set(newAccount.id, newAccount);
      return newAccount;
    },
    setActive: async (userId: string, accountId: string) => {
      if (overrides?.setActive) {
        return overrides.setActive(userId, accountId);
      }
      // Implementation
    },
    updateBalance: async (accountId: string, delta: number) => {
      if (overrides?.updateBalance) {
        return overrides.updateBalance(accountId, delta);
      }
      const account = accounts.get(accountId);
      if (account) {
        const currentBalance = typeof account.balance === 'number' ? account.balance : Number(account.balance.toString());
        const newBalance = currentBalance + delta;
        const updated: Account = {
          ...account,
          balance: newBalance,
        };
        accounts.set(accountId, updated);
        return updated;
      }
      throw new Error('Account not found');
    },
  };
}

/**
 * Mock TradeRepository
 */
export function mockTradeRepository(overrides?: Partial<TradeRepository>): TradeRepository {
  const trades = new Map<string, Trade>();

  return {
    create: async (trade: Omit<Trade, 'id' | 'openedAt'>) => {
      if (overrides?.create) {
        return overrides.create(trade);
      }
      const newTrade: Trade = {
        ...trade,
        id: `trade-${Date.now()}`,
        openedAt: new Date(),
      };
      trades.set(newTrade.id, newTrade);
      return newTrade;
    },
    findOpenExpired: async (now: Date) => {
      if (overrides?.findOpenExpired) {
        return overrides.findOpenExpired(now);
      }
      return Array.from(trades.values()).filter(
        (trade) => trade.status === TradeStatus.OPEN && trade.expiresAt <= now,
      );
    },
    findById: async (id: string) => {
      if (overrides?.findById) {
        return overrides.findById(id);
      }
      return trades.get(id) || null;
    },
    findByUserId: async (userId: string) => {
      if (overrides?.findByUserId) {
        return overrides.findByUserId(userId);
      }
      return Array.from(trades.values()).filter((trade) => trade.userId === userId);
    },
    updateResult: async (id: string, exitPrice: number, status: TradeStatus, closedAt: Date) => {
      if (overrides?.updateResult) {
        return overrides.updateResult(id, exitPrice, status, closedAt);
      }
      const trade = trades.get(id);
      if (!trade) {
        // If trade not in cache, create it (for tests that don't pre-create)
        const newTrade: Trade = {
          id,
          userId: 'test-user',
          accountId: 'test-account',
          direction: 'CALL' as any,
          amount: 100,
          entryPrice: 50000,
          exitPrice,
          payout: 0.8,
          status,
          openedAt: new Date(),
          expiresAt: new Date(),
          closedAt,
        };
        trades.set(id, newTrade);
        return newTrade;
      }
      const updatedTrade: Trade = {
        ...trade,
        exitPrice,
        status,
        closedAt,
      };
      trades.set(id, updatedTrade);
      return updatedTrade;
    },
  };
}

/**
 * Mock Clock
 */
export function mockClock(overrides?: Partial<Clock>): Clock {
  let currentTime = Date.now();

  return {
    now: () => {
      if (overrides?.now) {
        return overrides.now();
      }
      return currentTime;
    },
    // Helper to advance time
    advance: (ms: number) => {
      currentTime += ms;
    },
    // Helper to set time
    setTime: (time: number) => {
      currentTime = time;
    },
  } as Clock & { advance: (ms: number) => void; setTime: (time: number) => void };
}
