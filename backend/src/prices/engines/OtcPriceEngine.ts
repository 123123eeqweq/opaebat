/**
 * OTC Price Engine - generates price ticks using controlled random walk
 */

import type { PriceConfig, PriceTick, PriceEvent } from '../PriceTypes.js';
import { PriceStore } from '../store/PriceStore.js';
import { PriceEventBus } from '../events/PriceEventBus.js';
import { logger } from '../../shared/logger.js';

export class OtcPriceEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private currentPrice: number;
  private isRunning = false;

  constructor(
    private config: PriceConfig,
    private instrumentId: string, // FLOW P3: for priceStore key
    private priceStore: PriceStore,
    private eventBus: PriceEventBus,
  ) {
    this.currentPrice = config.initialPrice;
  }

  /**
   * Start price generation
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Price engine is already running');
      return;
    }

    logger.info(`Starting OTC price engine for ${this.config.asset}`);
    this.isRunning = true;

    // Generate first price immediately
    this.generateTick();

    // Schedule periodic ticks
    this.intervalId = setInterval(() => {
      this.generateTick();
    }, this.config.tickInterval);
  }

  /**
   * Stop price generation
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info(`Stopping OTC price engine for ${this.config.asset}`);
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current price
   */
  getCurrentPrice(): PriceTick | null {
    if (!this.isRunning) {
      return null;
    }

    return {
      price: this.currentPrice,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate price tick using controlled random walk
   */
  private generateTick(): void {
    // Controlled random walk algorithm
    // Generate random change within volatility range
    const changePercent = (Math.random() - 0.5) * 2 * this.config.volatility; // -volatility to +volatility
    const change = this.currentPrice * changePercent;
    
    // Apply change
    let newPrice = this.currentPrice + change;

    // Ensure price stays within bounds
    if (newPrice < this.config.minPrice) {
      newPrice = this.config.minPrice;
    } else if (newPrice > this.config.maxPrice) {
      newPrice = this.config.maxPrice;
    }

    // Update current price
    this.currentPrice = newPrice;

    // Create tick
    const tick: PriceTick = {
      price: this.currentPrice,
      timestamp: Date.now(),
    };

    // Store in memory (per instrument)
    this.priceStore.setCurrentPrice(this.instrumentId, tick).catch((error) => {
      logger.error('Failed to store current price:', error);
    });

    // Emit event
    const event: PriceEvent = {
      type: 'price_tick',
      data: tick,
      timestamp: Date.now(),
    };
    this.eventBus.emit(event);
  }
}
