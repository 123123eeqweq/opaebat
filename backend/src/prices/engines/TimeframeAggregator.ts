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
  '2m': 120,
  '3m': 180,
  '5m': 300,
  '10m': 600,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

export class TimeframeAggregator {
  private aggregators: Map<Timeframe, Candle | null> = new Map();
  private unsubscribeCandleClosed: (() => void) | null = null;
  private isRunning = false;

  constructor(
    private instrumentId: string, // instrumentId для агрегации (EURUSD, EURUSD_REAL)
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
   * 
   * FLOW TIMEFRAME-CLOSE: Закрытие агрегированной свечи происходит когда
   * последняя 5s свеча периода закрывается (её endTime достигает границы)
   */
  private aggregateCandle(baseCandle: Candle, timeframe: Timeframe): void {
    const timeframeSeconds = TIMEFRAME_SECONDS[timeframe];
    const timeframeMs = timeframeSeconds * 1000;
    const baseTimeframeMs = 5000; // 5s base

    // Calculate candle start timestamp for this timeframe
    const candleStart = Math.floor(baseCandle.timestamp / timeframeMs) * timeframeMs;
    
    // 🔥 FIX: Вычисляем END TIME базовой свечи (timestamp + duration)
    const baseCandleEndTime = baseCandle.timestamp + baseTimeframeMs;
    
    // Вычисляем конец текущего агрегированного периода
    const aggregatedCandleEndTime = candleStart + timeframeMs;

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

    // 🔥 FIX: Проверяем, достигла ли базовая свеча конца агрегированного периода
    // Например: 5s свеча :05 имеет endTime = :10, что равно концу 10s свечи :00
    if (baseCandleEndTime >= aggregatedCandleEndTime) {
      // Базовая свеча завершает агрегированный период — закрываем!
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
    // Сохраняем в БД
    this.candleStore.addClosedCandle(this.instrumentId, candle).catch((error) => {
      logger.error(`Failed to store closed ${candle.timeframe} candle:`, error);
    });

    // 🔥 EMIT candle_closed EVENT для WebSocket
    // Без этого фронтенд не получает candle:close для таймфреймов кроме 5s
    const timeframeSeconds = TIMEFRAME_SECONDS[candle.timeframe as Timeframe];
    const slotEnd = candle.timestamp + (timeframeSeconds * 1000);
    
    const event: PriceEvent = {
      type: 'candle_closed',
      data: candle,
      timestamp: slotEnd,
    };
    
    this.eventBus.emit(event);
    
    logger.debug(`Emitted candle_closed for ${candle.timeframe} at ${new Date(candle.timestamp).toISOString()}`);
  }
}
