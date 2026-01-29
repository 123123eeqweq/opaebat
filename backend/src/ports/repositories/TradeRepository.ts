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
  updateResult(id: string, exitPrice: number, status: TradeStatus, closedAt: Date): Promise<Trade>;
}
