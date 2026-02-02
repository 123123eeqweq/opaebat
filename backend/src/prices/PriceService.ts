/**
 * Price Service - legacy single-instrument facade
 * @deprecated Use PriceEngineManager. Kept so existing getPriceService() callers still work.
 */

import type { PriceConfig, CandleConfig, PriceTick, Candle, Timeframe } from './PriceTypes.js';
import { OtcPriceEngine } from './engines/OtcPriceEngine.js';
import { CandleEngine } from './engines/CandleEngine.js';
import { TimeframeAggregator } from './engines/TimeframeAggregator.js';
import { PriceStore } from './store/PriceStore.js';
import { CandleStore } from './store/CandleStore.js';
import { PriceEventBus } from './events/PriceEventBus.js';
import { DEFAULT_INSTRUMENT_ID, getInstrumentOrDefault } from '../config/instruments.js';
import { logger } from '../shared/logger.js';

export class PriceService {
  private priceEngine: OtcPriceEngine | null = null;
  private candleEngine: CandleEngine | null = null;
  private aggregator: TimeframeAggregator | null = null;
  private eventBus: PriceEventBus | null = null;
  private isRunning = false;
  private readonly instrumentId = DEFAULT_INSTRUMENT_ID;
  private readonly symbol: string;

  constructor(
    private priceConfig: PriceConfig,
    private candleConfig: CandleConfig,
  ) {
    this.symbol = getInstrumentOrDefault(this.instrumentId).engine.asset;
  }

  getEventBus(): PriceEventBus | null {
    return this.eventBus;
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Price service is already running');
      return;
    }
    logger.info('Starting price service (legacy single-instrument)...');
    const priceStore = new PriceStore();
    const candleStore = new CandleStore();
    this.eventBus = new PriceEventBus();
    this.priceEngine = new OtcPriceEngine(
      this.priceConfig,
      this.instrumentId,
      priceStore,
      this.eventBus,
    );
    this.candleEngine = new CandleEngine(this.instrumentId, candleStore, this.eventBus);
    this.aggregator = new TimeframeAggregator(
      this.instrumentId,
      this.candleConfig.aggregationTimeframes,
      candleStore,
      this.eventBus,
    );
    this.priceEngine.start();
    this.candleEngine.start();
    this.aggregator.start();
    this.isRunning = true;
    logger.info('✅ Price service started');
  }

  stop(): void {
    if (!this.isRunning) return;
    logger.info('Stopping price service...');
    if (this.priceEngine) {
      this.priceEngine.stop();
      this.priceEngine = null;
    }
    if (this.candleEngine) {
      this.candleEngine.stop();
      this.candleEngine = null;
    }
    if (this.aggregator) {
      this.aggregator.stop();
      this.aggregator = null;
    }
    this.eventBus = null;
    this.isRunning = false;
    logger.info('✅ Price service stopped');
  }

  async getCurrentPrice(): Promise<PriceTick | null> {
    if (!this.isRunning || !this.priceEngine) return null;
    return this.priceEngine.getCurrentPrice();
  }

  async getCandles(timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    if (!this.isRunning) return [];
    const candleStore = new CandleStore();
    return candleStore.getClosedCandles(this.instrumentId, timeframe, limit);
  }
}
