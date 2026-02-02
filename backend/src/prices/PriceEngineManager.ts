/**
 * FLOW P2 — PriceEngineManager
 *
 * Один класс — много инстансов engines per instrument.
 * Map<instrumentId, { priceEngine, candleEngine, aggregator, eventBus }>
 */

import type { PriceTick, Timeframe } from './PriceTypes.js';
import type { Candle } from './PriceTypes.js';
import { OtcPriceEngine } from './engines/OtcPriceEngine.js';
import { RealPriceEngine } from './engines/RealPriceEngine.js';
import { CandleEngine } from './engines/CandleEngine.js';
import { TimeframeAggregator } from './engines/TimeframeAggregator.js';
import { PriceStore } from './store/PriceStore.js';
import { CandleStore } from './store/CandleStore.js';
import { PriceEventBus } from './events/PriceEventBus.js';
import { PricePointWriter } from './PricePointWriter.js';
import { INSTRUMENTS, getInstrumentOrDefault } from '../config/instruments.js';
import { logger } from '../shared/logger.js';

const CANDLE_CONFIG = {
  baseTimeframe: '5s' as const,
  aggregationTimeframes: [
    '10s', '15s', '30s', '1m', '2m', '3m', '5m', 
    '10m', '15m', '30m', '1h', '4h', '1d'
  ] as Timeframe[], // Агрегируем все таймфреймы из 5s свечей
};

interface InstrumentEngines {
  priceEngine: OtcPriceEngine | RealPriceEngine;
  candleEngine: CandleEngine;
  aggregator: TimeframeAggregator;
  eventBus: PriceEventBus;
}

export class PriceEngineManager {
  private priceStore = new PriceStore();
  private candleStore = new CandleStore();
  private pricePointWriter = new PricePointWriter();
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
      // Унифицированный symbol для всех инструментов (EUR/USD формат)
      // Используется для CandleEngine, TimeframeAggregator, Redis, WebSocket routing
      let symbol: string;
      if (config.source === 'otc') {
        if (!config.engine) {
          logger.error(`[PriceEngineManager] OTC instrument ${instrumentId} missing engine config`);
          continue;
        }
        symbol = config.engine.asset; // "EUR/USD", "BTC/USD"
      } else if (config.source === 'real') {
        if (!config.real) {
          logger.error(`[PriceEngineManager] Real instrument ${instrumentId} missing real config`);
          continue;
        }
        symbol = config.real.symbol; // "EUR/USD" - унифицированный формат
      } else {
        logger.error(`[PriceEngineManager] Unknown source for ${instrumentId}: ${(config as any).source}`);
        continue;
      }

      logger.debug(`🔧 Initializing engines for ${instrumentId} (${symbol}, source: ${config.source})`);

      const eventBus = new PriceEventBus();

      // FLOW R6: Создаем engine в зависимости от источника
      let priceEngine: OtcPriceEngine | RealPriceEngine;

      if (config.source === 'otc') {
        // OTC engine (существующая логика)
        priceEngine = new OtcPriceEngine(
          config.engine!,
          instrumentId,
          this.priceStore,
          eventBus,
        );
      } else if (config.source === 'real') {
        // Real engine (новый)
        const apiKey = process.env.XCHANGE_API_KEY || '1qo4zRecPUTdgOod8u6ob14hSdVXOANH';
        priceEngine = new RealPriceEngine(
          instrumentId,
          {
            pair: config.real!.pair,
            apiKey,
          },
          eventBus,
        );
      } else {
        logger.error(`[PriceEngineManager] Unknown source for ${instrumentId}: ${(config as any).source}`);
        continue;
      }

      // CandleEngine и Aggregator работают для всех источников
      // Используем instrumentId для разделения OTC и REAL источников
      const candleEngine = new CandleEngine(instrumentId, this.candleStore, eventBus);
      const aggregator = new TimeframeAggregator(
        instrumentId,
        CANDLE_CONFIG.aggregationTimeframes,
        this.candleStore,
        eventBus,
      );

      priceEngine.start();
      candleEngine.start();
      aggregator.start();

      // FLOW R-LINE-2: Подписываемся на price_tick для записи price points
      // Используем instrumentId напрямую (унифицированный ключ для OTC и REAL)
      eventBus.on('price_tick', (event) => {
        if (event.type === 'price_tick') {
          const tick = event.data as PriceTick;
          // FLOW R-LINE-1: Используем instrumentId как ключ в БД (не symbol)
          this.pricePointWriter.handleTick(instrumentId, tick.price, tick.timestamp).catch((error) => {
            logger.error(`[PriceEngineManager] Failed to write price point for ${instrumentId}:`, error);
          });
        }
      });

      this.engines.set(instrumentId, {
        priceEngine,
        candleEngine,
        aggregator,
        eventBus,
      });
      
      logger.debug(`✅ Engines started for ${instrumentId} (${config.source})`);
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
   * Get current price for instrument (id = BTCUSD, EURUSD, EURUSD_REAL, …)
   */
  async getCurrentPrice(instrumentId: string): Promise<PriceTick | null> {
    const eng = this.engines.get(instrumentId);
    if (!this.isRunning || !eng) return null;
    
    // RealPriceEngine.getCurrentPrice() возвращает null
    // Для real источников можно получить из PriceStore
    const price = eng.priceEngine.getCurrentPrice();
    if (price) return price;
    
    // Fallback: получаем из PriceStore (Redis)
    return this.priceStore.getCurrentPrice(instrumentId);
  }

  /**
   * Get candles for instrument + timeframe
   */
  async getCandles(instrumentId: string, timeframe: Timeframe, limit: number = 100): Promise<Candle[]> {
    if (!this.isRunning) return [];
    // Используем instrumentId напрямую для разделения OTC и REAL источников
    return this.candleStore.getClosedCandles(instrumentId, timeframe, limit);
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
    // Используем instrumentId напрямую для разделения OTC и REAL источников
    return this.candleStore.getClosedCandlesBefore(instrumentId, timeframe, toTime, limit);
  }
}
