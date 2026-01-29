/**
 * Candle store — per instrument (symbol):
 * - active candle — in-memory key candle:active:${symbol}
 * - closed candles — PostgreSQL, symbol = engine.asset (e.g. "BTC/USD")
 * FLOW P3: instrument-scoped
 */

import { getRedisClient } from '../../bootstrap/redis.js';
import { getPrismaClient } from '../../bootstrap/database.js';
import type { Candle, Timeframe } from '../PriceTypes.js';
import { logger } from '../../shared/logger.js';

function activeKey(symbol: string): string {
  return `candle:active:${symbol}`;
}

export class CandleStore {
  /**
   * Store active candle (in-memory) for symbol
   */
  async setActiveCandle(symbol: string, candle: Candle): Promise<void> {
    const redis = getRedisClient();
    const data = JSON.stringify(candle);
    await redis.set(activeKey(symbol), data);
  }

  /**
   * Get active candle (in-memory) for symbol
   */
  async getActiveCandle(symbol: string): Promise<Candle | null> {
    const redis = getRedisClient();
    const data = await redis.get(activeKey(symbol));

    if (!data) {
      return null;
    }

    try {
      if (typeof data === 'string') {
        return JSON.parse(data) as Candle;
      }
      if (typeof data === 'object') {
        return data as Candle;
      }
      return null;
    } catch (error) {
      logger.error('Failed to parse active candle from store:', error);
      return null;
    }
  }

  /**
   * Add closed candle — пишем в БД по symbol
   */
  async addClosedCandle(symbol: string, candle: Candle): Promise<void> {
    const prisma = getPrismaClient();
    const ts = typeof candle.timestamp === 'number' ? candle.timestamp : new Date(candle.timestamp).getTime();

    try {
      await prisma.candle.create({
        data: {
          symbol,
          timeframe: candle.timeframe,
          timestamp: BigInt(ts),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        },
      });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === 'P2002') {
        return;
      }
      logger.error('Failed to save closed candle to DB:', e);
      throw e;
    }
  }

  /**
   * Get closed candles (последние N по времени) for symbol
   */
  async getClosedCandles(symbol: string, timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    const prisma = getPrismaClient();

    const rows = await prisma.candle.findMany({
      where: { symbol, timeframe },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return rows
      .slice()
      .reverse()
      .map((r) => ({
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        timestamp: Number(r.timestamp),
        timeframe: r.timeframe,
      }));
  }

  /**
   * Get closed candles before a specific time for symbol
   */
  async getClosedCandlesBefore(
    symbol: string,
    timeframe: Timeframe,
    toTime: number,
    limit: number = 200
  ): Promise<Candle[]> {
    const prisma = getPrismaClient();

    const rows = await prisma.candle.findMany({
      where: {
        symbol,
        timeframe,
        timestamp: { lt: BigInt(toTime) },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return rows
      .slice()
      .reverse()
      .map((r) => ({
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        timestamp: Number(r.timestamp),
        timeframe: r.timeframe,
      }));
  }

  /**
   * Clear active candle (in-memory) for symbol. БД не трогаем.
   */
  async clear(symbol: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(activeKey(symbol));
  }
}
