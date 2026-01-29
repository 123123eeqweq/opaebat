/**
 * Domain tests: TradeClosingService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TradeClosingService } from '../../src/domain/trades/TradeClosingService.js';
import { TradeStatus, TradeDirection } from '../../src/domain/trades/TradeTypes.js';
import { mockPriceProvider } from '../helpers/mocks.js';
import { mockAccountRepository } from '../helpers/mocks.js';
import { mockTradeRepository } from '../helpers/mocks.js';
import { createTestTrade, createTestAccount } from '../helpers/factories.js';

describe('TradeClosingService', () => {
  let closingService: TradeClosingService;
  let tradeRepository: ReturnType<typeof mockTradeRepository>;
  let accountRepository: ReturnType<typeof mockAccountRepository>;
  let priceProvider: ReturnType<typeof mockPriceProvider>;

  beforeEach(() => {
    tradeRepository = mockTradeRepository();
    accountRepository = mockAccountRepository();
    priceProvider = mockPriceProvider();
    closingService = new TradeClosingService(tradeRepository, accountRepository, priceProvider);
  });

  describe('closeExpiredTrades', () => {
    it('should close CALL trade as WIN when exitPrice > entryPrice', async () => {
      const entryPrice = 50000;
      const exitPrice = 51000; // Higher = WIN for CALL

      const trade = createTestTrade({
        direction: TradeDirection.CALL,
        entryPrice,
        amount: 100,
        payout: 0.8,
        status: TradeStatus.OPEN,
      });

      const now = new Date();
      tradeRepository.findOpenExpired = async () => [trade];
      priceProvider.getCurrentPrice = async () => ({ price: exitPrice, timestamp: Date.now() });

      let updatedTrade: any = null;
      tradeRepository.updateResult = async (id, exit, status, closedAt) => {
        updatedTrade = { id, exitPrice: exit, status, closedAt };
        return {
          ...trade,
          exitPrice: exit,
          status,
          closedAt,
        };
      };

      let balanceDelta = 0;
      accountRepository.updateBalance = async (accountId, delta) => {
        balanceDelta = delta;
      };

      // Execute
      await closingService.closeExpiredTrades();

      // Assert
      expect(updatedTrade).toBeDefined();
      expect(updatedTrade.status).toBe(TradeStatus.WIN);
      expect(updatedTrade.exitPrice).toBe(exitPrice);
      expect(balanceDelta).toBe(180); // 100 (amount) + 80 (payout)
    });

    it('should close CALL trade as LOSS when exitPrice <= entryPrice', async () => {
      const entryPrice = 50000;
      const exitPrice = 49000; // Lower = LOSS for CALL

      const trade = createTestTrade({
        direction: TradeDirection.CALL,
        entryPrice,
        amount: 100,
        payout: 0.8,
        status: TradeStatus.OPEN,
      });

      tradeRepository.findOpenExpired = async () => [trade];
      priceProvider.getCurrentPrice = async () => ({ price: exitPrice, timestamp: Date.now() });

      let updatedTrade: any = null;
      tradeRepository.updateResult = async (id, exit, status, closedAt) => {
        updatedTrade = { id, exitPrice: exit, status, closedAt };
        return {
          ...trade,
          exitPrice: exit,
          status,
          closedAt,
        };
      };

      let balanceDelta = 0;
      accountRepository.updateBalance = async (accountId, delta) => {
        balanceDelta = delta;
      };

      // Execute
      await closingService.closeExpiredTrades();

      // Assert
      expect(updatedTrade).toBeDefined();
      expect(updatedTrade.status).toBe(TradeStatus.LOSS);
      expect(updatedTrade.exitPrice).toBe(exitPrice);
      expect(balanceDelta).toBe(0); // No payout for LOSS
    });

    it('should close PUT trade as WIN when exitPrice < entryPrice', async () => {
      const entryPrice = 50000;
      const exitPrice = 49000; // Lower = WIN for PUT

      const trade = createTestTrade({
        direction: TradeDirection.PUT,
        entryPrice,
        amount: 100,
        payout: 0.8,
        status: TradeStatus.OPEN,
      });

      tradeRepository.findOpenExpired = async () => [trade];
      priceProvider.getCurrentPrice = async () => ({ price: exitPrice, timestamp: Date.now() });

      let updatedTrade: any = null;
      tradeRepository.updateResult = async (id, exit, status, closedAt) => {
        updatedTrade = { id, exitPrice: exit, status, closedAt };
        return {
          ...trade,
          exitPrice: exit,
          status,
          closedAt,
        };
      };

      let balanceDelta = 0;
      accountRepository.updateBalance = async (accountId, delta) => {
        balanceDelta = delta;
      };

      // Execute
      await closingService.closeExpiredTrades();

      // Assert
      expect(updatedTrade).toBeDefined();
      expect(updatedTrade.status).toBe(TradeStatus.WIN);
      expect(balanceDelta).toBe(180); // 100 + 80
    });

    it('should close PUT trade as LOSS when exitPrice >= entryPrice', async () => {
      const entryPrice = 50000;
      const exitPrice = 51000; // Higher = LOSS for PUT

      const trade = createTestTrade({
        direction: TradeDirection.PUT,
        entryPrice,
        amount: 100,
        payout: 0.8,
        status: TradeStatus.OPEN,
      });

      tradeRepository.findOpenExpired = async () => [trade];
      priceProvider.getCurrentPrice = async () => ({ price: exitPrice, timestamp: Date.now() });

      let updatedTrade: any = null;
      tradeRepository.updateResult = async (id, exit, status, closedAt) => {
        updatedTrade = { id, exitPrice: exit, status, closedAt };
        return {
          ...trade,
          exitPrice: exit,
          status,
          closedAt,
        };
      };

      let balanceDelta = 0;
      accountRepository.updateBalance = async (accountId, delta) => {
        balanceDelta = delta;
      };

      // Execute
      await closingService.closeExpiredTrades();

      // Assert
      expect(updatedTrade).toBeDefined();
      expect(updatedTrade.status).toBe(TradeStatus.LOSS);
      expect(balanceDelta).toBe(0); // No payout
    });

    it('should calculate payout correctly', async () => {
      const entryPrice = 50000;
      const exitPrice = 51000;
      const amount = 100;
      const payoutPercent = 80;

      const trade = createTestTrade({
        direction: TradeDirection.CALL,
        entryPrice,
        amount,
        payout: payoutPercent / 100,
        status: TradeStatus.OPEN,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      const trades = new Map<string, Trade>();
      trades.set(trade.id, trade);

      tradeRepository.findOpenExpired = async () => [trade];
      tradeRepository.updateResult = async (id, exit, status, closedAt) => {
        const updated = { ...trade, exitPrice: exit, status, closedAt };
        trades.set(id, updated);
        return updated;
      };

      priceProvider.getCurrentPrice = async () => ({ price: exitPrice, timestamp: Date.now() });

      let balanceDelta = 0;
      accountRepository.updateBalance = async (accountId, delta) => {
        balanceDelta = delta;
      };

      await closingService.closeExpiredTrades();

      // Payout = amount + (amount * payoutPercent / 100)
      // = 100 + 80 = 180
      expect(balanceDelta).toBe(180);
    });

    it('should not close trade twice', async () => {
      const trade = createTestTrade({
        status: TradeStatus.OPEN,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      });

      let closeCount = 0;
      const trades = new Map<string, Trade>();
      trades.set(trade.id, trade);

      // Add account to mock
      const account = createTestAccount({
        id: trade.accountId,
        userId: trade.userId,
        balance: 1000,
      });
      const accounts = new Map<string, typeof account>();
      accounts.set(account.id, account);
      accountRepository.findById = async (id: string) => accounts.get(id) || null;
      accountRepository.updateBalance = async (accountId: string, delta: number) => {
        const acc = accounts.get(accountId);
        if (!acc) throw new Error('Account not found');
        const updated = { ...acc, balance: acc.balance + delta };
        accounts.set(accountId, updated);
        return updated;
      };

      tradeRepository.findOpenExpired = async (now: Date) => {
        // First call: return expired trade
        // Second call: return empty (trade already closed)
        if (closeCount === 0) {
          return [trade];
        }
        return [];
      };

      tradeRepository.updateResult = async (id, exitPrice, status, closedAt) => {
        closeCount++;
        const updated = { ...trade, status, exitPrice, closedAt };
        trades.set(id, updated);
        return updated;
      };

      priceProvider.getCurrentPrice = async () => ({ price: 51000, timestamp: Date.now() });

      // Execute twice
      await closingService.closeExpiredTrades();
      await closingService.closeExpiredTrades();

      // Should only close once (second call finds no expired trades)
      expect(closeCount).toBe(1);
    });
  });
});
