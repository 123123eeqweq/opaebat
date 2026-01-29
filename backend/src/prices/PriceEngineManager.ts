/**
 * FLOW P2 — PriceEngineManager
 *
 * Один класс — много инстансов engines per instrument.
 * Map<instrumentId, { priceEngine, candleEngine, aggregator, eventBus }>
 */

import type { PriceTick, Timeframe } from './PriceTypes.js';
import type { Candle } from './PriceTypes.js';
import { OtcPriceEngine } from './engines/OtcPriceEngine.js';
import { CandleEngine } from './engines/CandleEngine.js';
import { TimeframeAggregator } from './engines/TimeframeAggregator.js';
import { PriceStore } from './store/PriceStore.js';
import { CandleStore } from './store/CandleStore.js';
import { PriceEventBus } from './events/PriceEventBus.js';
import { INSTRUMENTS, getInstrumentOrDefault } from '../config/instruments.js';
import { logger } from '../shared/logger.js';

const CANDLE_CONFIG = {
  baseTimeframe: '5s' as const,
  aggregationTimeframes: ['10s', '15s', '30s', '1m'] as Timeframe[],
};

interface InstrumentEngines {
  priceEngine: OtcPriceEngine;
  candleEngine: CandleEngine;
  aggregator: TimeframeAggregator;
  eventBus: PriceEventBus;
}

export class PriceEngineManager {
  private priceStore = new PriceStore();
  private candleStore = new CandleStore();
  private engines = new Map<string, InstrumentEngines>();
  private isRunning = false;

  /**
   * Get event bus for instrument (for WebSocket)
   */
  getEventBus(instrumentId: string): PriceEventBus | null {
    return this.engines.get(instrumentId)?.eventBus ?? null;
  }

  /**
   * Get all instrument ids (for WS bootstrap)
   */
  getInstrumentIds(): string[] {
    return Array.from(this.engines.keys());
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Price engine manager already running');
      return;
    }

    logger.info('Starting PriceEngineManager (multi-instrument)...');

    for (const [instrumentId, config] of Object.entries(INSTRUMENTS)) {
      const { engine: priceConfig } = config;
      const symbol = priceConfig.asset; // "BTC/USD", "EUR/USD"

      const eventBus = new PriceEventBus();
      const priceEngine = new OtcPriceEngine(
        priceConfig,
        instrumentId,
        this.priceStore,
        eventBus,
      );
      const candleEngine = new CandleEngine(symbol, this.candleStore, eventBus);
      const aggregator = new TimeframeAggregator(
        symbol,
        CANDLE_CONFIG.aggregationTimeframes,
        this.candleStore,
        eventBus,
      );

      priceEngine.start();
      candleEngine.start();
      aggregator.start();

      this.engines.set(instrumentId, {
        priceEngine,
        candleEngine,
        aggregator,
        eventBus,
      });
    }

    this.isRunning = true;
    logger.info(`✅ PriceEngineManager started (${this.engines.size} instruments)`);
  }

  stop(): void {
    if (!this.isRunning) return;

    logger.info('Stopping PriceEngineManager...');

    for (const [id, { priceEngine, candleEngine, aggregator }] of this.engines) {
      priceEngine.stop();
      candleEngine.stop();
      aggregator.stop();
    }
    this.engines.clear();
    this.isRunning = false;
    logger.info('✅ PriceEngineManager stopped');
  }

  /**
   * Get current price for instrument (id = BTCUSD, EURUSD, …)
   */
  async getCurrentPrice(instrumentId: string): Promise<PriceTick | null> {
    const eng = this.engines.get(instrumentId);
    if (!this.isRunning || !eng) return null;
    return eng.priceEngine.getCurrentPrice();
  }

  /**
   * Get candles for instrument + timeframe
   */
  async getCandles(instrumentId: string, timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    if (!this.isRunning) return [];
    const config = getInstrumentOrDefault(instrumentId);
    const symbol = config.engine.asset;
    return this.candleStore.getClosedCandles(symbol, timeframe, limit);
  }

  /**
   * Get closed candles before time (for history loading)
   */
  async getCandlesBefore(
    instrumentId: string,
    timeframe: Timeframe,
    toTime: number,
    limit: number = 200,
  ): Promise<Candle[]> {
    if (!this.isRunning) return [];
    const config = getInstrumentOrDefault(instrumentId);
    const symbol = config.engine.asset;
    return this.candleStore.getClosedCandlesBefore(symbol, timeframe, toTime, limit);
  }
}
