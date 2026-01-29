/**
 * Terminal Snapshot Adapter - aggregates data from various sources
 * FLOW P4: uses PriceEngineManager, instrument = instrumentId (BTCUSD, …)
 */

import type { TerminalSnapshotPort } from '../../ports/terminal/TerminalSnapshotPort.js';
import type { TerminalSnapshot, SnapshotCandle } from '../../domain/terminal/TerminalSnapshotTypes.js';
import type { Timeframe } from '../../prices/PriceTypes.js';
import type { UserRepository } from '../../ports/repositories/UserRepository.js';
import type { AccountRepository } from '../../ports/repositories/AccountRepository.js';
import type { TradeRepository } from '../../ports/repositories/TradeRepository.js';
import type { PriceEngineManager } from '../../prices/PriceEngineManager.js';
import type { Clock } from '../../domain/time/TimeTypes.js';
import { TradeStatus } from '../../domain/trades/TradeTypes.js';
import { TimeService } from '../../domain/time/TimeService.js';
import { getInstrumentOrDefault } from '../../config/instruments.js';

export class TerminalSnapshotAdapter implements TerminalSnapshotPort {
  private timeService: TimeService;

  constructor(
    private userRepository: UserRepository,
    private accountRepository: AccountRepository,
    private tradeRepository: TradeRepository,
    private getManager: () => PriceEngineManager,
    clock: Clock,
  ) {
    this.timeService = new TimeService(clock);
  }

  async getSnapshot(userId: string, instrument: string, timeframe: Timeframe): Promise<TerminalSnapshot> {
    const serverTime = this.timeService.now();
    const manager = this.getManager();
    const config = getInstrumentOrDefault(instrument);
    const symbol = config.engine.asset; // "BTC/USD", "EUR/USD"

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const accounts = await this.accountRepository.findByUserId(userId);
    const accountsDTO = accounts.map((acc) => ({
      id: acc.id,
      type: acc.type as 'demo' | 'real',
      balance: acc.balance.toString(),
      currency: acc.currency,
      isActive: acc.isActive,
    }));

    const activeAccount = await this.accountRepository.findActiveByUserId(userId);
    const activeAccountDTO = activeAccount
      ? {
          id: activeAccount.id,
          type: activeAccount.type as 'demo' | 'real',
          balance: activeAccount.balance.toString(),
          currency: activeAccount.currency,
        }
      : null;

    const priceData = await manager.getCurrentPrice(instrument);
    const priceDTO = priceData
      ? {
          asset: symbol,
          value: priceData.price,
          timestamp: priceData.timestamp,
        }
      : {
          asset: symbol,
          value: 0,
          timestamp: serverTime,
        };

    const candles = await manager.getCandles(instrument, timeframe, 100);
    const candlesDTO: SnapshotCandle[] = candles.map((candle) => {
      const timestamp =
        typeof candle.timestamp === 'number'
          ? candle.timestamp
          : new Date(candle.timestamp).getTime();

      return {
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        startTime: timestamp,
        endTime: timestamp + this.getTimeframeMs(timeframe),
      };
    });

    const allTrades = await this.tradeRepository.findByUserId(userId);
    const openTrades = allTrades.filter((t) => t.status === TradeStatus.OPEN);
    const openTradesDTO = openTrades.map((trade) => ({
      id: trade.id,
      direction: trade.direction as 'CALL' | 'PUT',
      amount: trade.amount.toString(),
      entryPrice: trade.entryPrice.toString(),
      expiresAt: trade.expiresAt.getTime(),
      payout: trade.payout.toString(),
      secondsLeft: this.timeService.secondsLeft(trade.expiresAt.getTime()),
    }));

    return {
      instrument,
      user: {
        id: user.id,
        email: user.email,
      },
      accounts: accountsDTO,
      activeAccount: activeAccountDTO,
      price: priceDTO,
      candles: {
        timeframe,
        items: candlesDTO,
      },
      openTrades: openTradesDTO,
      serverTime,
    };
  }

  private getTimeframeMs(timeframe: Timeframe): number {
    const timeframeSeconds: Record<Timeframe, number> = {
      '5s': 5,
      '10s': 10,
      '15s': 15,
      '30s': 30,
      '1m': 60,
    };
    return timeframeSeconds[timeframe] * 1000;
  }
}
