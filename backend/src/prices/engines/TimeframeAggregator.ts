/**
 * Timeframe Aggregator - aggregates 5s candles into other timeframes
 */

import type { Candle, Timeframe, PriceEvent } from '../PriceTypes.js';
import { CandleStore } from '../store/CandleStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '5s': 5,
  '10s': 10,
  '15s': 15,
  '30s': 30,
  '1m': 60,
};

export class TimeframeAggregator {
  private aggregators: Map<Timeframe, Candle | null> = new Map();
  private unsubscribeCandleClosed: (() => void) | null = null;
  private isRunning = false;

  constructor(
    private symbol: string, // FLOW P3: e.g. "BTC/USD" for store
    private timeframes: Timeframe[],
    private candleStore: CandleStore,
    private eventBus: PriceEventBus,
  ) {
    this.timeframes.forEach((tf) => {
      this.aggregators.set(tf, null);
    });
  }

  /**
   * Start aggregator
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Timeframe aggregator is already running');
      return;
    }

    logger.info(`Starting timeframe aggregator for: ${this.timeframes.join(', ')}`);
    this.isRunning = true;

    // Subscribe to closed 5s candles
    this.unsubscribeCandleClosed = this.eventBus.on('candle_closed', (event) => {
      const candle = event.data as Candle;
      if (candle.timeframe === '5s') {
        this.handleBaseCandle(candle);
      }
    });
  }

  /**
   * Stop aggregator
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping timeframe aggregator');
    this.isRunning = false;

    if (this.unsubscribeCandleClosed) {
      this.unsubscribeCandleClosed();
      this.unsubscribeCandleClosed = null;
    }

    // Clear all aggregators
    this.aggregators.clear();
    this.timeframes.forEach((tf) => {
      this.aggregators.set(tf, null);
    });
  }

  /**
   * Handle base candle (5s)
   */
  private handleBaseCandle(baseCandle: Candle): void {
    this.timeframes.forEach((timeframe) => {
      this.aggregateCandle(baseCandle, timeframe);
    });
  }

  /**
   * Aggregate candle into timeframe
   */
  private aggregateCandle(baseCandle: Candle, timeframe: Timeframe): void {
    const timeframeSeconds = TIMEFRAME_SECONDS[timeframe];

    // Calculate candle start timestamp for this timeframe
    const candleStart = Math.floor(
      baseCandle.timestamp / (timeframeSeconds * 1000),
    ) * (timeframeSeconds * 1000);

    let aggregator = this.aggregators.get(timeframe);

    if (!aggregator || aggregator.timestamp !== candleStart) {
      // New candle for this timeframe
      if (aggregator) {
        // Close previous candle
        this.closeAggregatedCandle(aggregator);
      }

      // Open new candle
      // Rule: open[n] = close[n-1]
      const previousClose = aggregator ? aggregator.close : baseCandle.open;
      
      aggregator = {
        open: previousClose,
        high: baseCandle.high,
        low: baseCandle.low,
        close: baseCandle.close,
        timestamp: candleStart,
        timeframe,
      };

      this.aggregators.set(timeframe, aggregator);
    } else {
      // Update existing candle
      aggregator.high = Math.max(aggregator.high, baseCandle.high);
      aggregator.low = Math.min(aggregator.low, baseCandle.low);
      aggregator.close = baseCandle.close;

      this.aggregators.set(timeframe, aggregator);
    }

    // Check if this candle should be closed (when we move to next timeframe period)
    const nextCandleStart = candleStart + timeframeSeconds * 1000;
    if (baseCandle.timestamp >= nextCandleStart - 100) { // Small buffer for timing
      // Close current candle
      if (aggregator) {
        this.closeAggregatedCandle(aggregator);
        this.aggregators.set(timeframe, null);
      }
    }
  }

  /**
   * Close aggregated candle (per symbol)
   */
  private closeAggregatedCandle(candle: Candle): void {
    this.candleStore.addClosedCandle(this.symbol, candle).catch((error) => {
      logger.error(`Failed to store closed ${candle.timeframe} candle:`, error);
    });
  }
}
