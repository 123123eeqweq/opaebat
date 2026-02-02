/**
 * Prisma implementation of TradeRepository
 */

import { Prisma } from '@prisma/client';
import { getPrismaClient } from '../../bootstrap/database.js';
import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { Trade } from '../../domain/trades/TradeTypes.js';
import { TradeStatus } from '../../domain/trades/TradeTypes.js';

export class PrismaTradeRepository implements TradeRepository {
  async create(tradeData: Omit<Trade, 'id' | 'openedAt'>): Promise<Trade> {
    const prisma = getPrismaClient();
    const trade = await prisma.trade.create({
      data: {
        userId: tradeData.userId,
        accountId: tradeData.accountId,
        direction: tradeData.direction as 'CALL' | 'PUT',
        instrument: tradeData.instrument, // ✅ Сохраняем instrument
        amount: new Prisma.Decimal(tradeData.amount),
        entryPrice: new Prisma.Decimal(tradeData.entryPrice),
        exitPrice: tradeData.exitPrice !== null ? new Prisma.Decimal(tradeData.exitPrice) : null,
        payout: new Prisma.Decimal(tradeData.payout),
        status: tradeData.status as 'OPEN' | 'WIN' | 'LOSS',
        expiresAt: tradeData.expiresAt,
        closedAt: tradeData.closedAt,
      },
    });

    return this.toDomain(trade);
  }

  async findOpenExpired(now: Date): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: {
        status: 'OPEN',
        expiresAt: {
          lte: now,
        },
      },
    });

    return trades.map(this.toDomain);
  }

  async findById(id: string): Promise<Trade | null> {
    const prisma = getPrismaClient();
    const trade = await prisma.trade.findUnique({
      where: { id },
    });

    return trade ? this.toDomain(trade) : null;
  }

  async findByUserId(userId: string): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
    });

    return trades.map(this.toDomain);
  }

  async findByUserIdPaginated(
    userId: string,
    status: 'open' | 'closed',
    limit: number,
    offset: number
  ): Promise<{ trades: Trade[]; hasMore: boolean }> {
    const prisma = getPrismaClient();
    const where =
      status === 'open'
        ? { userId, status: 'OPEN' as const }
        : { userId, status: { in: ['WIN', 'LOSS', 'TIE'] as const }, closedAt: { not: null } };
    const orderBy = status === 'open'
      ? { openedAt: 'desc' as const }
      : { closedAt: 'desc' as const };

    const trades = await prisma.trade.findMany({
      where,
      orderBy,
      take: limit + 1,
      skip: offset,
    });

    const hasMore = trades.length > limit;
    const result = hasMore ? trades.slice(0, limit) : trades;

    return {
      trades: result.map((t) => this.toDomain(t)),
      hasMore,
    };
  }

  async findByAccountId(accountId: string): Promise<Trade[]> {
    const prisma = getPrismaClient();
    const trades = await prisma.trade.findMany({
      where: { accountId },
      orderBy: { openedAt: 'desc' },
    });

    return trades.map(this.toDomain);
  }

  async updateResult(
    id: string,
    exitPrice: number,
    status: TradeStatus,
    closedAt: Date,
  ): Promise<Trade> {
    const prisma = getPrismaClient();

    // Use transaction for atomicity
    const trade = await prisma.$transaction(async (tx) => {
      return tx.trade.update({
        where: { id },
        data: {
          exitPrice: new Prisma.Decimal(exitPrice),
          status: status as 'OPEN' | 'WIN' | 'LOSS',
          closedAt,
        },
      });
    });

    return this.toDomain(trade);
  }

  private toDomain(trade: {
    id: string;
    userId: string;
    accountId: string;
    direction: string;
    instrument: string; // ✅ Добавляем instrument
    amount: Prisma.Decimal | number;
    entryPrice: Prisma.Decimal | number;
    exitPrice: Prisma.Decimal | number | null;
    payout: Prisma.Decimal | number;
    status: string;
    openedAt: Date;
    expiresAt: Date;
    closedAt: Date | null;
  }): Trade {
    return {
      id: trade.id,
      userId: trade.userId,
      accountId: trade.accountId,
      direction: trade.direction as 'CALL' | 'PUT',
      instrument: trade.instrument, // ✅ Читаем instrument из БД
      amount: typeof trade.amount === 'number' ? trade.amount : Number(trade.amount),
      entryPrice: typeof trade.entryPrice === 'number' ? trade.entryPrice : Number(trade.entryPrice),
      exitPrice: trade.exitPrice === null ? null : typeof trade.exitPrice === 'number' ? trade.exitPrice : Number(trade.exitPrice),
      payout: typeof trade.payout === 'number' ? trade.payout : Number(trade.payout),
      status: trade.status as 'OPEN' | 'WIN' | 'LOSS',
      openedAt: trade.openedAt,
      expiresAt: trade.expiresAt,
      closedAt: trade.closedAt,
    };
  }
}
