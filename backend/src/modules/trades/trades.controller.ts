/**
 * Trades controller - handles HTTP requests
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { TradeService } from '../../domain/trades/TradeService.js';
import { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import {
  InvalidTradeAmountError,
  InsufficientBalanceError,
  InvalidExpirationError,
  InvalidTradeDirectionError,
} from '../../domain/trades/TradeErrors.js';
import { AccountNotFoundError, UnauthorizedAccountAccessError } from '../../domain/accounts/AccountErrors.js';
import { TradeDirection } from '../../domain/trades/TradeTypes.js';
import { emitTradeOpen } from '../../bootstrap/websocket.bootstrap.js';
import { registerTradeForCountdown } from '../../bootstrap/time.bootstrap.js';
import { logger } from '../../shared/logger.js';

export class TradesController {
  constructor(private tradeService: TradeService) {}

  async openTrade(
    request: FastifyRequest<{
      Body: {
        accountId: string;
        direction: 'CALL' | 'PUT';
        amount: number;
        expirationSeconds: number;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware
      const { accountId, direction, amount, expirationSeconds } = request.body;

      const trade = await this.tradeService.openTrade({
        userId,
        accountId,
        direction: direction === 'CALL' ? TradeDirection.CALL : TradeDirection.PUT,
        amount,
        expirationSeconds,
      });

      const tradeDTO = this.toDTO(trade);

      // Emit WebSocket event
      try {
        emitTradeOpen(tradeDTO, userId);
        // Register trade for countdown updates
        const expiresAt = new Date(trade.expiresAt).getTime();
        registerTradeForCountdown(trade.id, userId, expiresAt);
      } catch (error) {
        logger.error('Failed to emit trade:open event:', error);
        // Don't fail the request if WS fails
      }

      return reply.status(201).send({
        trade: tradeDTO,
      });
    } catch (error) {
      if (error instanceof InvalidTradeAmountError) {
        return reply.status(400).send({
          error: 'Invalid trade amount',
          message: error.message,
        });
      }

      if (error instanceof InvalidTradeDirectionError) {
        return reply.status(400).send({
          error: 'Invalid trade direction',
          message: error.message,
        });
      }

      if (error instanceof InvalidExpirationError) {
        return reply.status(400).send({
          error: 'Invalid expiration',
          message: error.message,
        });
      }

      if (error instanceof InsufficientBalanceError) {
        return reply.status(400).send({
          error: 'Insufficient balance',
          message: error.message,
        });
      }

      if (error instanceof AccountNotFoundError || error instanceof UnauthorizedAccountAccessError) {
        return reply.status(403).send({
          error: 'Account access denied',
          message: error.message,
        });
      }

      logger.error('Open trade error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async getTrades(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.userId!; // Set by requireAuth middleware

      const trades = await this.tradeService.getTrades(userId);

      return reply.send({
        trades: trades.map((trade) => this.toDTO(trade)),
      });
    } catch (error) {
      logger.error('Get trades error:', error);
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  private toDTO(trade: any) {
    return {
      id: trade.id,
      accountId: trade.accountId,
      direction: trade.direction,
      amount: trade.amount.toString(),
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice !== null ? trade.exitPrice.toString() : null,
      payout: trade.payout.toString(),
      status: trade.status,
      openedAt: trade.openedAt.toISOString(),
      expiresAt: trade.expiresAt.toISOString(),
      closedAt: trade.closedAt !== null ? trade.closedAt.toISOString() : null,
    };
  }
}
