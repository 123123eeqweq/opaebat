/**
 * Trade Service - domain service for opening trades
 */

import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { TransactionRepository } from '../../ports/repositories/TransactionRepository.js';
import type { OpenTradeInput, Trade } from './TradeTypes.js';
import { TradeDirection, TradeStatus } from './TradeTypes.js';
import {
  InvalidTradeAmountError,
  InsufficientBalanceError,
  InvalidExpirationError,
  InvalidTradeDirectionError,
} from './TradeErrors.js';
import { AccountNotFoundError, UnauthorizedAccountAccessError } from '../accounts/AccountErrors.js';
import { AccountType } from '../accounts/AccountTypes.js';

const PAYOUT_PERCENTAGE = 0.8; // 80% payout
const MIN_EXPIRATION = 5; // 5 seconds
const MAX_EXPIRATION = 300; // 5 minutes (300 seconds)
const EXPIRATION_STEP = 5; // Must be multiple of 5

export class TradeService {
  constructor(
    private tradeRepository: TradeRepository,
    private accountRepository: AccountRepository,
    private priceProvider: PriceProvider,
    private transactionRepository?: TransactionRepository, // Optional for balance history
  ) {}

  /**
   * Open a new trade
   */
  async openTrade(input: OpenTradeInput): Promise<Trade> {
    // Validate amount
    if (input.amount <= 0) {
      throw new InvalidTradeAmountError();
    }

    // Validate direction
    if (input.direction !== TradeDirection.CALL && input.direction !== TradeDirection.PUT) {
      throw new InvalidTradeDirectionError();
    }

    // Validate expiration
    if (
      input.expirationSeconds < MIN_EXPIRATION ||
      input.expirationSeconds > MAX_EXPIRATION ||
      input.expirationSeconds % EXPIRATION_STEP !== 0
    ) {
      throw new InvalidExpirationError();
    }

    // Verify account belongs to user and is active
    const account = await this.accountRepository.findById(input.accountId);
    if (!account) {
      throw new AccountNotFoundError();
    }

    if (account.userId !== input.userId) {
      throw new UnauthorizedAccountAccessError();
    }

    // Check balance
    if (Number(account.balance) < input.amount) {
      throw new InsufficientBalanceError();
    }

    // Get current price for the specified instrument
    const priceData = await this.priceProvider.getCurrentPrice(input.instrument);
    if (!priceData) {
      throw new Error(`Price service unavailable for instrument: ${input.instrument}`);
    }

    const entryPrice = priceData.price;

    // Calculate expiration time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.expirationSeconds * 1000);

    // Deduct amount from balance (atomic operation)
    await this.accountRepository.updateBalance(input.accountId, -input.amount);

    // Create trade
    const trade = await this.tradeRepository.create({
      userId: input.userId,
      accountId: input.accountId,
      direction: input.direction,
      instrument: input.instrument, // ✅ Сохраняем instrument
      amount: input.amount,
      entryPrice,
      exitPrice: null,
      payout: PAYOUT_PERCENTAGE,
      status: TradeStatus.OPEN,
      expiresAt,
      closedAt: null,
    });

    return trade;
  }

  /**
   * Get trades for user
   */
  async getTrades(userId: string): Promise<Trade[]> {
    return this.tradeRepository.findByUserId(userId);
  }

  async getTradesPaginated(
    userId: string,
    status: 'open' | 'closed',
    limit: number,
    offset: number
  ): Promise<{ trades: Trade[]; hasMore: boolean }> {
    return this.tradeRepository.findByUserIdPaginated(userId, status, limit, offset);
  }

  /**
   * 🔥 FLOW TRADE-STATS: Get trading statistics for user (REAL account only)
   */
  async getTradeStatistics(userId: string): Promise<{
    totalTrades: number;
    winRate: number; // Percentage (0-100)
    totalVolume: number; // Sum of all trade amounts
    netProfit: number; // Total profit/loss
    winCount: number;
    lossCount: number;
    tieCount: number;
    maxTrade: { amount: number; date: string } | null;
    minTrade: { amount: number; date: string } | null;
    bestProfit: { profit: number; date: string } | null;
  }> {
    // Get REAL account only
    const realAccount = await this.accountRepository.findByUserIdAndType(userId, AccountType.REAL);
    if (!realAccount) {
      // Return empty stats if no real account
      return {
        totalTrades: 0,
        winRate: 0,
        totalVolume: 0,
        netProfit: 0,
        winCount: 0,
        lossCount: 0,
        tieCount: 0,
        maxTrade: null,
        minTrade: null,
        bestProfit: null,
      };
    }

    const trades = await this.tradeRepository.findByAccountId(realAccount.id);
    
    const closedTrades = trades.filter(t => t.status !== TradeStatus.OPEN && t.closedAt !== null);
    
    const totalTrades = trades.length;
    const winCount = trades.filter(t => t.status === TradeStatus.WIN).length;
    const lossCount = trades.filter(t => t.status === TradeStatus.LOSS).length;
    const tieCount = trades.filter(t => t.status === TradeStatus.TIE).length;
    
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    
    const totalVolume = trades.reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Calculate net profit: WIN trades get payout, LOSS trades lose amount, TIE returns amount
    const netProfit = trades.reduce((sum, t) => {
      if (t.status === TradeStatus.WIN) {
        return sum + Number(t.amount) * Number(t.payout);
      } else if (t.status === TradeStatus.LOSS) {
        return sum - Number(t.amount);
      } else if (t.status === TradeStatus.TIE) {
        return sum; // Amount returned, no profit/loss
      }
      return sum;
    }, 0);
    
    // Find max/min trade amounts
    const tradesWithAmounts = trades.map(t => ({
      amount: Number(t.amount),
      date: t.openedAt.toISOString(),
    }));
    
    const maxTrade = tradesWithAmounts.length > 0
      ? tradesWithAmounts.reduce((max, t) => t.amount > max.amount ? t : max)
      : null;
    
    const minTrade = tradesWithAmounts.length > 0
      ? tradesWithAmounts.reduce((min, t) => t.amount < min.amount ? t : min)
      : null;
    
    // Find best profit (single WIN trade with highest profit)
    const winTrades = trades.filter(t => t.status === TradeStatus.WIN);
    const bestProfit = winTrades.length > 0
      ? winTrades
          .map(t => ({
            profit: Number(t.amount) * Number(t.payout),
            date: t.closedAt?.toISOString() || t.openedAt.toISOString(),
          }))
          .reduce((best, t) => t.profit > best.profit ? t : best)
      : null;
    
    return {
      totalTrades,
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
      totalVolume,
      netProfit,
      winCount,
      lossCount,
      tieCount,
      maxTrade,
      minTrade,
      bestProfit,
    };
  }

  /**
   * 🔥 FLOW TRADE-STATS: Get balance history by date range for REAL account
   * Returns array of { date: string (YYYY-MM-DD), balance: number }
   */
  async getBalanceHistory(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Array<{ date: string; balance: number }>> {
    // Get REAL account only
    const realAccount = await this.accountRepository.findByUserIdAndType(userId, AccountType.REAL);
    if (!realAccount || !this.transactionRepository) {
      return [];
    }

    // Normalize dates
    const normalizedStartDate = new Date(startDate);
    normalizedStartDate.setHours(0, 0, 0, 0);
    const normalizedEndDate = new Date(endDate);
    normalizedEndDate.setHours(23, 59, 59, 999);

    // Validate date range
    if (normalizedStartDate > normalizedEndDate) {
      return [];
    }

    // Get all transactions and trades for the account
    const allTransactions = await this.transactionRepository.findByAccountId(realAccount.id);
    const allTrades = await this.tradeRepository.findByAccountId(realAccount.id);

    // Calculate initial balance (before startDate)
    // Sum all confirmed transactions before startDate
    const initialTransactions = allTransactions.filter(t => 
      t.status === 'CONFIRMED' && 
      t.createdAt < normalizedStartDate
    );
    let initialBalance = 0;
    for (const tx of initialTransactions) {
      if (tx.type === 'DEPOSIT') {
        initialBalance += Number(tx.amount);
      } else if (tx.type === 'WITHDRAW') {
        initialBalance -= Number(tx.amount);
      }
    }

    // Sum all trades closed before startDate
    const initialTrades = allTrades.filter(t => 
      t.closedAt !== null && 
      t.closedAt < normalizedStartDate
    );
    for (const trade of initialTrades) {
      if (trade.status === TradeStatus.WIN) {
        initialBalance += Number(trade.amount) * Number(trade.payout);
      } else if (trade.status === TradeStatus.LOSS) {
        initialBalance -= Number(trade.amount);
      }
      // TIE: amount returned, no change
    }

    // Filter transactions and trades within date range
    const relevantTransactions = allTransactions.filter(t => 
      t.status === 'CONFIRMED' && 
      t.createdAt >= normalizedStartDate && 
      t.createdAt <= normalizedEndDate
    );

    const relevantTrades = allTrades.filter(t => 
      t.closedAt !== null && 
      t.closedAt >= normalizedStartDate && 
      t.closedAt <= normalizedEndDate
    );

    // Group by day and calculate daily changes
    const dailyChanges: Map<string, number> = new Map();
    
    // Initialize all days with 0 change
    const currentDate = new Date(normalizedStartDate);
    while (currentDate <= normalizedEndDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyChanges.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process transactions (deposits add, withdrawals subtract)
    for (const tx of relevantTransactions) {
      const dateKey = tx.createdAt.toISOString().split('T')[0];
      const currentChange = dailyChanges.get(dateKey) || 0;
      if (tx.type === 'DEPOSIT') {
        dailyChanges.set(dateKey, currentChange + Number(tx.amount));
      } else if (tx.type === 'WITHDRAW') {
        dailyChanges.set(dateKey, currentChange - Number(tx.amount));
      }
    }

    // Process trades (WIN adds profit, LOSS subtracts amount, TIE does nothing)
    for (const trade of relevantTrades) {
      if (trade.closedAt) {
        const dateKey = trade.closedAt.toISOString().split('T')[0];
        const currentChange = dailyChanges.get(dateKey) || 0;
        if (trade.status === TradeStatus.WIN) {
          dailyChanges.set(dateKey, currentChange + Number(trade.amount) * Number(trade.payout));
        } else if (trade.status === TradeStatus.LOSS) {
          dailyChanges.set(dateKey, currentChange - Number(trade.amount));
        }
        // TIE: amount returned, no change
      }
    }

    // Calculate cumulative balance day by day
    let cumulativeBalance = initialBalance;
    const result: Array<{ date: string; balance: number }> = [];
    
    const sortedDates = Array.from(dailyChanges.keys()).sort();
    for (const dateKey of sortedDates) {
      cumulativeBalance += dailyChanges.get(dateKey) || 0;
      result.push({
        date: dateKey,
        balance: cumulativeBalance,
      });
    }

    // If no data, return array with current balance
    if (result.length === 0) {
      const currentBalance = Number(realAccount.balance);
      return [{
        date: normalizedEndDate.toISOString().split('T')[0],
        balance: currentBalance,
      }];
    }

    return result;
  }

  /**
   * Get trade analytics by date range: distribution by instrument and direction
   */
  async getTradeAnalytics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    byInstrument: Array<{ instrument: string; count: number; volume: number; winCount: number }>;
    byDirection: { call: { count: number; winCount: number }; put: { count: number; winCount: number } };
  }> {
    const realAccount = await this.accountRepository.findByUserIdAndType(userId, AccountType.REAL);
    if (!realAccount) {
      return {
        byInstrument: [],
        byDirection: { call: { count: 0, winCount: 0 }, put: { count: 0, winCount: 0 } },
      };
    }

    const trades = await this.tradeRepository.findByAccountId(realAccount.id);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const closedTrades = trades.filter(
      (t) => t.closedAt !== null && t.closedAt >= start && t.closedAt <= end
    );

    const byInstrumentMap = new Map<string, { count: number; volume: number; winCount: number }>();
    let callCount = 0;
    let callWinCount = 0;
    let putCount = 0;
    let putWinCount = 0;

    for (const t of closedTrades) {
      const inst = t.instrument || 'Unknown';
      const existing = byInstrumentMap.get(inst) || { count: 0, volume: 0, winCount: 0 };
      existing.count += 1;
      existing.volume += Number(t.amount);
      if (t.status === TradeStatus.WIN) existing.winCount += 1;
      byInstrumentMap.set(inst, existing);

      if (t.direction === 'CALL') {
        callCount += 1;
        if (t.status === TradeStatus.WIN) callWinCount += 1;
      } else {
        putCount += 1;
        if (t.status === TradeStatus.WIN) putWinCount += 1;
      }
    }

    const byInstrument = Array.from(byInstrumentMap.entries())
      .map(([instrument, data]) => ({ instrument, ...data }))
      .sort((a, b) => b.count - a.count);

    return {
      byInstrument,
      byDirection: {
        call: { count: callCount, winCount: callWinCount },
        put: { count: putCount, winCount: putWinCount },
      },
    };
  }
}
