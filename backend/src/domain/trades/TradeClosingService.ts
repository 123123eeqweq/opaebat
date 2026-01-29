/**
 * Trade Closing Service - closes expired trades
 */

import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { Trade } from './TradeTypes.js';
import { TradeStatus } from './TradeTypes.js';
import { TradeEntity } from './TradeEntity.js';
import { emitTradeClose } from '../../bootstrap/websocket.bootstrap.js';
import { unregisterTradeFromCountdown } from '../../bootstrap/time.bootstrap.js';
import { logger } from '../../shared/logger.js';

export class TradeClosingService {
  constructor(
    private tradeRepository: TradeRepository,
    private accountRepository: AccountRepository,
    private priceProvider: PriceProvider,
  ) {}

  /**
   * Close all expired trades
   */
  async closeExpiredTrades(): Promise<void> {
    const now = new Date();

    // Find all open expired trades
    const expiredTrades = await this.tradeRepository.findOpenExpired(now);

    if (expiredTrades.length === 0) {
      return;
    }

    logger.info(`Closing ${expiredTrades.length} expired trade(s)`);

    // Get current price once (for all trades)
    const priceData = await this.priceProvider.getCurrentPrice('BTC/USD');
    if (!priceData) {
      logger.error('Price service unavailable, skipping trade closure');
      return;
    }

    const exitPrice = priceData.price;

    // Close each trade
    for (const tradeData of expiredTrades) {
      try {
        await this.closeTrade(tradeData, exitPrice, now);
      } catch (error) {
        logger.error(`Failed to close trade ${tradeData.id}:`, error);
        // Continue with other trades
      }
    }
  }

  /**
   * Close a single trade
   */
  private async closeTrade(tradeData: Trade, exitPrice: number, closedAt: Date): Promise<void> {
    // Create entity
    const trade = new TradeEntity(
      tradeData.id,
      tradeData.userId,
      tradeData.accountId,
      tradeData.direction,
      tradeData.amount,
      tradeData.entryPrice,
      exitPrice,
      tradeData.payout,
      tradeData.status,
      tradeData.openedAt,
      tradeData.expiresAt,
      tradeData.closedAt,
    );

    // Determine result
    const status = trade.determineResult();

    // Calculate payout amount
    const payoutAmount = trade.calculatePayoutAmount();

    // Update trade and balance in transaction
    // Note: We'll handle transaction in repository if needed
    // For now, update trade first, then balance

    // Update trade
    const updatedTrade = await this.tradeRepository.updateResult(trade.id, exitPrice, status, closedAt);

    // Update balance
    if (status === TradeStatus.WIN) {
      // Add payout amount (original amount + payout)
      const totalReturn = trade.amount + payoutAmount;
      await this.accountRepository.updateBalance(trade.accountId, totalReturn);
      logger.info(`Trade ${trade.id} closed as WIN. Payout: ${totalReturn}`);
    } else {
      // LOSS: amount already deducted, nothing to add
      logger.info(`Trade ${trade.id} closed as LOSS. Amount lost: ${trade.amount}`);
    }

    // Emit WebSocket event
    try {
      const tradeDTO: import('./TradeTypes.js').TradeDTO = {
        id: updatedTrade.id,
        accountId: updatedTrade.accountId,
        direction: updatedTrade.direction,
        amount: updatedTrade.amount.toString(),
        entryPrice: updatedTrade.entryPrice.toString(),
        exitPrice: updatedTrade.exitPrice !== null ? updatedTrade.exitPrice.toString() : null,
        payout: updatedTrade.payout.toString(),
        status: updatedTrade.status,
        openedAt: updatedTrade.openedAt.toISOString(),
        expiresAt: updatedTrade.expiresAt.toISOString(),
        closedAt: updatedTrade.closedAt !== null ? updatedTrade.closedAt.toISOString() : null,
      };
      emitTradeClose(tradeDTO, trade.userId, status === TradeStatus.WIN ? 'WIN' : 'LOSS');
      // Unregister trade from countdown updates
      unregisterTradeFromCountdown(trade.id);
    } catch (error) {
      logger.error('Failed to emit trade:close event:', error);
      // Don't fail the closing if WS fails
    }
    
    // Always unregister from countdown, even if WS fails
    try {
      unregisterTradeFromCountdown(trade.id);
    } catch (error) {
      // Ignore errors in cleanup
    }
  }
}
