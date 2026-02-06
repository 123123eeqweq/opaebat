/**
 * FLOW R3-R5: RealPriceEngine - адаптер для реальных котировок
 * 
 * Ответственность:
 * - WebSocket подключение к xchangeapi.com
 * - Парсинг протокола (code 0 = INIT, code 1 = UPDATE)
 * - Нормализация в price_tick формат
 * - Эмиссия событий в PriceEventBus
 * 
 * ⚠️ ВАЖНО: Real-котировки НЕ трогают графики, свечи, трейды, UI
 * Они ТОЛЬКО эмитят price_tick в PriceEventBus
 */

import WebSocket from 'ws'; // Node.js WebSocket клиент
import type { PriceEventBus } from '../events/PriceEventBus.js';
import type { PriceTick, PriceEvent } from '../PriceTypes.js';
import { logger } from '../../shared/logger.js';

interface InitMeta {
  session_uid: string;
  time_mult: number;
  start_time: number;
  order: string[];
  mapping: Record<string, string>;
}

interface RealPriceEngineConfig {
  pair: string; // 'EURUSD' для xchangeapi
  apiKey: string;
}

export class RealPriceEngine {
  private ws: WebSocket | null = null;
  private isRunning = false;
  private meta: InitMeta | null = null;
  private pendingUpdates: string[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly RECONNECT_DELAY = 5000; // 5 секунд
  
  /**
   * FLOW R-TIME: Offset между market-time и server-time (в миллисекундах)
   * Используется для нормализации времени REAL тиков к server-time
   * чтобы свечи закрывались синхронно с сеткой (:00, :05, :10...)
   */
  private timeOffsetMs: number = 0;
  private offsetCalculated: boolean = false;

  constructor(
    private instrumentId: string,
    private config: RealPriceEngineConfig,
    private eventBus: PriceEventBus,
  ) {}

  /**
   * FLOW R4: Запуск WebSocket подключения
   */
  start(): void {
    if (this.isRunning) {
      logger.warn(`[RealPriceEngine] ${this.instrumentId} already running`);
      return;
    }

    logger.info(`[RealPriceEngine] Starting for ${this.instrumentId} (pair: ${this.config.pair})`);
    this.isRunning = true;
    this.connect();
  }

  /**
   * FLOW R4: Подключение к WebSocket
   */
  private connect(): void {
    if (!this.isRunning) return;

    try {
      // FLOW R4: WebSocket с header api-key
      // В Node.js ws библиотеке headers передаются через опции
      this.ws = new WebSocket('wss://api.xchangeapi.com/websocket/live', {
        headers: {
          'api-key': this.config.apiKey,
        },
      });

      this.ws.on('open', () => {
        logger.info(`[RealPriceEngine] ${this.instrumentId} WebSocket connected`);
        
        // FLOW R4: Отправляем подписку на пару
        const subscribeMessage = JSON.stringify({ pairs: [this.config.pair] });
        logger.debug(`[RealPriceEngine] ${this.instrumentId} Sending subscribe: ${subscribeMessage}`);
        this.ws?.send(subscribeMessage);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error: Error) => {
        logger.error(`[RealPriceEngine] ${this.instrumentId} WebSocket error:`, error);
      });

      this.ws.on('close', (code?: number, reason?: Buffer) => {
        logger.warn(`[RealPriceEngine] ${this.instrumentId} WebSocket closed (code: ${code}, reason: ${reason?.toString() ?? 'unknown'})`);
        this.ws = null;
        this.meta = null;
        this.pendingUpdates = [];
        // FLOW R-TIME: Сбрасываем offset при переподключении для пересчета
        this.timeOffsetMs = 0;
        this.offsetCalculated = false;

        // Автоматическое переподключение
        if (this.isRunning) {
          logger.info(`[RealPriceEngine] ${this.instrumentId} Reconnecting in ${this.RECONNECT_DELAY}ms...`);
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, this.RECONNECT_DELAY);
        }
      });
    } catch (error) {
      logger.error(`[RealPriceEngine] ${this.instrumentId} Failed to create WebSocket:`, error);
      if (this.isRunning) {
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, this.RECONNECT_DELAY);
      }
    }
  }

  /**
   * FLOW R5: Обработка сообщений от WebSocket
   */
  private handleMessage(data: string): void {
    if (!data || data.length === 0) {
      logger.warn(`[RealPriceEngine] ${this.instrumentId} Empty message received`);
      return;
    }

    const code = data[0];
    const payload = data.slice(1);

    // FLOW R5: Code 0 - INIT (метаданные)
    if (code === '0') {
      this.handleInit(payload);
      return;
    }

    // FLOW R5: Code 1 - UPDATE (обновление цены)
    if (code === '1') {
      this.handleUpdate(payload);
      return;
    }

    // FLOW R5: Code 2 - Ping (игнорируем)
    if (code === '2') {
      return;
    }

    logger.debug(`[RealPriceEngine] ${this.instrumentId} Unknown message code: ${code}`);
  }

  /**
   * FLOW R5: Обработка INIT сообщения
   */
  private handleInit(payload: string): void {
    try {
      const meta = JSON.parse(payload) as InitMeta;
      this.meta = meta;
      
      logger.info(`[RealPriceEngine] ${this.instrumentId} INIT received: session_uid=${meta.session_uid}, pairs=${meta.order.length}`);
      logger.debug(`[RealPriceEngine] ${this.instrumentId} Mapping: ${JSON.stringify(meta.mapping)}`);
      logger.debug(`[RealPriceEngine] ${this.instrumentId} Time mult: ${meta.time_mult}, Start time: ${meta.start_time}`);

      // FLOW R-TIME: Offset будет вычислен при первом тике для большей точности
      // Пока что инициализируем базовый offset на основе start_time
      const marketTimeMs = Math.floor(meta.start_time * 1000);
      const serverTimeMs = Date.now();
      this.timeOffsetMs = serverTimeMs - marketTimeMs;
      this.offsetCalculated = false; // Будет уточнен при первом тике
      
      logger.debug(`[RealPriceEngine] ${this.instrumentId} Initial time offset: ${this.timeOffsetMs}ms (will be refined with first tick)`);

      // FLOW R5: Обрабатываем накопленные обновления
      if (this.pendingUpdates.length > 0) {
        logger.info(`[RealPriceEngine] ${this.instrumentId} Processing ${this.pendingUpdates.length} pending updates...`);
        const updates = [...this.pendingUpdates];
        this.pendingUpdates = [];
        updates.forEach(updatePayload => {
          this.processUpdate(updatePayload, meta);
        });
      }
    } catch (error) {
      logger.error(`[RealPriceEngine] ${this.instrumentId} Failed to parse INIT:`, error);
    }
  }

  /**
   * FLOW R5: Обработка UPDATE сообщения
   */
  private handleUpdate(payload: string): void {
    if (!this.meta) {
      // FLOW R5: Кешируем обновления до получения INIT
      this.pendingUpdates.push(payload);
      if (this.pendingUpdates.length === 1) {
        logger.debug(`[RealPriceEngine] ${this.instrumentId} Caching update (waiting for INIT)`);
      }
      return;
    }

    this.processUpdate(payload, this.meta);
  }

  /**
   * FLOW R5: Парсинг и нормализация обновления цены
   */
  private processUpdate(payload: string, meta: InitMeta): void {
    try {
      const parts = payload.split('|');

      if (parts.length !== meta.order.length) {
        logger.warn(`[RealPriceEngine] ${this.instrumentId} Parts count mismatch: expected ${meta.order.length}, got ${parts.length}`);
        return;
      }

      // Создаем объект из частей используя order
      const obj: any = {};
      meta.order.forEach((key, i) => {
        obj[key] = parts[i];
      });

      // Получаем название пары из mapping
      const pairName = meta.mapping[obj.name];
      if (!pairName) {
        logger.warn(`[RealPriceEngine] ${this.instrumentId} Unknown pair name: ${obj.name}`);
        return;
      }

      // FLOW R5: Нормализация ask/bid
      const ask = Number(obj.ask);
      const bid = Number(obj.bid);

      if (isNaN(ask) || isNaN(bid)) {
        logger.warn(`[RealPriceEngine] ${this.instrumentId} Invalid ask/bid: ask=${obj.ask}, bid=${obj.bid}`);
        return;
      }

      // FLOW R5: Вычисляем среднюю цену (mid price)
      const price = (ask + bid) / 2;

      // FLOW R5: Нормализация времени (timestamp в миллисекундах)
      const relativeTime = Number(obj.time);
      if (isNaN(relativeTime)) {
        logger.warn(`[RealPriceEngine] ${this.instrumentId} Invalid time: ${obj.time}`);
        return;
      }

      // Вычисляем market-time timestamp
      const timestampSeconds = meta.start_time + relativeTime / meta.time_mult;
      const marketTimeMs = Math.floor(timestampSeconds * 1000);
      
      // FLOW R-TIME: Уточняем offset при первом тике для синхронизации с server-time
      // Используем текущий тик как референсную точку для вычисления точного offset
      if (!this.offsetCalculated) {
        const serverTimeMs = Date.now();
        // Вычисляем offset так, чтобы market-time тик соответствовал текущему server-time
        // Это обеспечит синхронное закрытие свечей с server-time сеткой
        this.timeOffsetMs = serverTimeMs - marketTimeMs;
        this.offsetCalculated = true;
        logger.debug(`[RealPriceEngine] ${this.instrumentId} Time offset refined from first tick: ${this.timeOffsetMs}ms (market=${new Date(marketTimeMs).toISOString()}, server=${new Date(serverTimeMs).toISOString()})`);
      }
      
      // FLOW R-TIME: Нормализуем к server-time для синхронного закрытия свечей
      // Добавляем offset, чтобы тики попадали в server-time слоты (:00, :05, :10...)
      const timestampMs = marketTimeMs + this.timeOffsetMs;

      // FLOW R5: Эмиссия price_tick события
      const tick: PriceTick = {
        price,
        timestamp: timestampMs,
      };

      const event: PriceEvent = {
        type: 'price_tick',
        data: tick,
        timestamp: Date.now(),
      };

      this.eventBus.emit(event);

      // DEBUG logging disabled to reduce log spam (18 REAL pairs emit many ticks per second)
      // logger.debug(`[RealPriceEngine] ${this.instrumentId} Emitted price_tick: ${price.toFixed(5)} @ ${new Date(timestampMs).toISOString()}`);
    } catch (error) {
      logger.error(`[RealPriceEngine] ${this.instrumentId} Failed to process update:`, error);
    }
  }

  /**
   * FLOW R3: Остановка engine
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info(`[RealPriceEngine] Stopping ${this.instrumentId}`);
    this.isRunning = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.meta = null;
    this.pendingUpdates = [];
    this.timeOffsetMs = 0; // Сбрасываем offset при отключении
    this.offsetCalculated = false;
  }

  /**
   * Получить текущую цену (если доступна)
   */
  getCurrentPrice(): PriceTick | null {
    // Real engine не хранит текущую цену в памяти
    // Можно получить из PriceStore через eventBus
    return null;
  }
}
