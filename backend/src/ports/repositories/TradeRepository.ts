/**
 * Trade repository port (interface)
 */

import type { Trade } from '../../domain/trades/TradeTypes.js';
import { TradeStatus } from '../../domain/trades/TradeTypes.js';

export interface TradeRepository {
  create(trade: Omit<Trade, 'id' | 'openedAt'>): Promise<Trade>;
  findOpenExpired(now: Date): Promise<Trade[]>;
  findById(id: string): Promise<Trade | null>;
  findByUserId(userId: string): Promise<Trade[]>;
  findByUserIdPaginated(
    userId: string,
    status: 'open' | 'closed',
    limit: number,
    offset: number
  ): Promise<{ trades: Trade[]; hasMore: boolean }>;
  findByAccountId(accountId: string): Promise<Trade[]>;
  /** Closed trades before date (for initial balance calc) */
  findClosedByAccountIdBefore(accountId: string, beforeDate: Date): Promise<Trade[]>;
  /** Closed trades in date range (for balance history / analytics) */
  findClosedByAccountIdInDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Trade[]>;
  updateResult(id: string, exitPrice: number, status: TradeStatus, closedAt: Date): Promise<Trade>;
}
