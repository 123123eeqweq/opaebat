/**
 * Candle Engine - aggregates price ticks into 5s candles
 */

import type { Candle, PriceTick, PriceEvent, Timeframe } from '../PriceTypes.js';
import { CandleStore } from '../store/CandleStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

const BASE_TIMEFRAME_SECONDS = 5; // 5 seconds

export class CandleEngine {
  private activeCandle: Candle | null = null;
  private candleInterval: NodeJS.Timeout | null = null;
  private unsubscribePriceTick: (() => void) | null = null;
  private isRunning = false;

  constructor(
    private symbol: string, // FLOW P3: e.g. "BTC/USD" for store keys
    private candleStore: CandleStore,
    private eventBus: PriceEventBus,
  ) {}

  /**
   * Start candle engine
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Candle engine is already running');
      return;
    }

    logger.info('Starting candle engine (5s base timeframe)');
    this.isRunning = true;

    // Subscribe to price ticks
    this.unsubscribePriceTick = this.eventBus.on('price_tick', (event) => {
      this.handlePriceTick(event.data as PriceTick);
    });

    // Start candle interval (5 seconds)
    this.candleInterval = setInterval(() => {
      this.closeCandle();
    }, BASE_TIMEFRAME_SECONDS * 1000);
  }

  /**
   * Stop candle engine
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping candle engine');
    this.isRunning = false;

    if (this.unsubscribePriceTick) {
      this.unsubscribePriceTick();
      this.unsubscribePriceTick = null;
    }

    if (this.candleInterval) {
      clearInterval(this.candleInterval);
      this.candleInterval = null;
    }

    // Close current candle if exists
    if (this.activeCandle) {
      this.closeCandle();
    }
  }

  /**
   * Handle price tick
   */
  private handlePriceTick(tick: PriceTick): void {
    if (!this.activeCandle) {
      // First tick - open new candle
      this.openCandle(tick);
    } else {
      // Update existing candle
      this.updateCandle(tick);
    }
  }

  /**
   * Open new candle
   */
  private openCandle(tick: PriceTick): void {
    const now = Date.now();
    // Round down to 5s boundary
    const candleStart = Math.floor(now / (BASE_TIMEFRAME_SECONDS * 1000)) * (BASE_TIMEFRAME_SECONDS * 1000);

    this.activeCandle = {
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      timestamp: candleStart,
      timeframe: '5s',
    };

    // Store active candle (per symbol)
    this.candleStore.setActiveCandle(this.symbol, this.activeCandle).catch((error) => {
      logger.error('Failed to store active candle:', error);
    });

    // Emit event
    const event: PriceEvent = {
      type: 'candle_opened',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }

  /**
   * Update active candle
   */
  private updateCandle(tick: PriceTick): void {
    if (!this.activeCandle) {
      return;
    }

    // Update high/low/close
    this.activeCandle.high = Math.max(this.activeCandle.high, tick.price);
    this.activeCandle.low = Math.min(this.activeCandle.low, tick.price);
    this.activeCandle.close = tick.price;

    // Store updated candle (per symbol)
    this.candleStore.setActiveCandle(this.symbol, this.activeCandle).catch((error) => {
      logger.error('Failed to store active candle:', error);
    });

    // Emit event
    const event: PriceEvent = {
      type: 'candle_updated',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }

  /**
   * Close current candle and start new one
   */
  private closeCandle(): void {
    if (!this.activeCandle) {
      return;
    }

    // Store closed candle (per symbol)
    this.candleStore.addClosedCandle(this.symbol, this.activeCandle).catch((error) => {
      logger.error('Failed to store closed candle:', error);
    });

    // Emit event
    const event: PriceEvent = {
      type: 'candle_closed',
      data: this.activeCandle,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);

    // Clear active candle (new one will be opened on next tick)
    this.activeCandle = null;
  }
}
