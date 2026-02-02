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
  private unsubscribePriceTick: (() => void) | null = null;
  private isRunning = false;

  constructor(
    private instrumentId: string, // instrumentId для агрегации (EURUSD, EURUSD_REAL)
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
    // FLOW FIX-CANDLE-TIMING: Закрытие свечей происходит по времени в handlePriceTick, не через setInterval
    this.unsubscribePriceTick = this.eventBus.on('price_tick', (event) => {
      this.handlePriceTick(event.data as PriceTick);
    });
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

    // Close current candle if exists
    if (this.activeCandle) {
      this.closeCandle();
    }
  }

  /**
   * Handle price tick
   * 
   * FLOW FIX-CANDLE-TIMING: Закрытие свечей по абсолютным границам времени
   * 
   * Алгоритм:
   * 1. Вычисляем текущий слот времени
   * 2. Если свечи нет → открыть
   * 3. Если тик в текущем слоте → обновить
   * 4. Если время вышло за слот → закрыть и открыть новую
   */
  private handlePriceTick(tick: PriceTick): void {
    const now = tick.timestamp;
    const timeframeMs = BASE_TIMEFRAME_SECONDS * 1000;
    
    // Вычисляем текущий слот времени
    const slotStart = Math.floor(now / timeframeMs) * timeframeMs;
    const slotEnd = slotStart + timeframeMs;
    
    // 1️⃣ Если свечи нет — открыть
    if (!this.activeCandle) {
      this.openCandle(slotStart, slotEnd, tick);
      return;
    }
    
    // 2️⃣ Проверяем, в каком слоте находится тик
    const currentSlotStart = this.activeCandle.timestamp;
    
    // Если тик находится в том же слоте, что и активная свеча — обновляем
    if (slotStart === currentSlotStart) {
      this.updateCandle(tick);
      return;
    }
    
    // 3️⃣ Если тик в новом слоте — ЗАКРЫТЬ предыдущую свечу
    this.closeCandle();
    
    // 4️⃣ Открыть новую свечу в новом слоте
    this.openCandle(slotStart, slotEnd, tick);
  }

  /**
   * Open new candle
   * 
   * FLOW FIX-CANDLE-TIMING: Используем переданные slotStart и slotEnd для точного времени
   */
  private openCandle(slotStart: number, slotEnd: number, tick: PriceTick): void {
    this.activeCandle = {
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
      timestamp: slotStart, // Нормализованное время начала слота
      timeframe: '5s',
    };

    // Store active candle (per instrumentId)
    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
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

    // Store updated candle (per instrumentId)
    this.candleStore.setActiveCandle(this.instrumentId, this.activeCandle).catch((error) => {
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
   * Close current candle
   * 
   * FLOW FIX-CANDLE-TIMING: Закрытие происходит по времени, не по интервалу
   * timestamp свечи уже нормализован, поэтому закрытие происходит ровно в границу слота
   */
  private closeCandle(): void {
    if (!this.activeCandle) {
      return;
    }

    // Store closed candle (per instrumentId)
    this.candleStore.addClosedCandle(this.instrumentId, this.activeCandle).catch((error) => {
      logger.error('Failed to store closed candle:', error);
    });

    // Emit event
    // FLOW FIX-CANDLE-TIMING: timestamp события = время закрытия (slotEnd), а не текущее время
    const slotEnd = this.activeCandle.timestamp + (BASE_TIMEFRAME_SECONDS * 1000);
    const event: PriceEvent = {
      type: 'candle_closed',
      data: this.activeCandle,
      timestamp: slotEnd, // Используем точное время закрытия слота
    };
    
    // Логирование для диагностики
    this.eventBus.emit(event);

    // Clear active candle (новая свеча будет открыта в handlePriceTick)
    this.activeCandle = null;
  }
}
