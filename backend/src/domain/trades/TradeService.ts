/**
 * Trade Service - domain service for opening trades
 */

import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { OpenTradeInput, Trade } from './TradeTypes.js';
import { TradeDirection, TradeStatus } from './TradeTypes.js';
import {
  InvalidTradeAmountError,
  InsufficientBalanceError,
  InvalidExpirationError,
  InvalidTradeDirectionError,
} from './TradeErrors.js';
import { AccountNotFoundError, UnauthorizedAccountAccessError } from '../accounts/AccountErrors.js';

const PAYOUT_PERCENTAGE = 0.8; // 80% payout
const MIN_EXPIRATION = 5; // 5 seconds
const MAX_EXPIRATION = 300; // 5 minutes (300 seconds)
const EXPIRATION_STEP = 5; // Must be multiple of 5

export class TradeService {
  constructor(
    private tradeRepository: TradeRepository,
    private accountRepository: AccountRepository,
    private priceProvider: PriceProvider,
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

    // Get current price
    const priceData = await this.priceProvider.getCurrentPrice('BTC/USD');
    if (!priceData) {
      throw new Error('Price service unavailable');
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
}
