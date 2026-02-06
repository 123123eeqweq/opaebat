/**
 * RealWebSocketHub - единое WebSocket соединение для ВСЕХ real-инструментов
 * 
 * Вместо 38 отдельных соединений (которые получают 429 rate limit),
 * открываем ОДНО соединение и подписываемся на все пары сразу.
 * 
 * Архитектура:
 * 1. Один WebSocket к xchangeapi.com
 * 2. Подписка: { pairs: ["EURUSD", "GBPUSD", "USDJPY", ...] }
 * 3. Получаем тики для всех пар в одном потоке
 * 4. Роутим тики в соответствующие EventBus по pair name
 */

import WebSocket from 'ws';
import type { PriceEventBus } from '../events/PriceEventBus.js';
import type { PriceTick, PriceEvent } from '../PriceTypes.js';
import { logger } from '../../shared/logger.js';
import {
  WS_HUB_BASE_RECONNECT_DELAY_MS,
  WS_HUB_MAX_RECONNECT_DELAY_MS,
} from '../../config/constants.js';

interface InitMeta {
  session_uid: string;
  time_mult: number;
  start_time: number;
  order: string[];
  mapping: Record<string, string>; // { "0": "EURUSD", "1": "GBPUSD", ... }
}

interface Subscriber {
  instrumentId: string;
  eventBus: PriceEventBus;
}

export class RealWebSocketHub {
  private ws: WebSocket | null = null;
  private isRunning = false;
  private meta: InitMeta | null = null;
  private pendingUpdates: string[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  // Роутинг: pair (EURUSD) → список подписчиков
  private subscribers = new Map<string, Subscriber[]>();
  
  // Все пары для подписки
  private allPairs: string[] = [];
  
  // Time sync
  private timeOffsetMs: number = 0;
  private offsetCalculated: boolean = false;
  
  // Reconnect с exponential backoff
  private reconnectAttempt = 0;
  private readonly BASE_RECONNECT_DELAY = WS_HUB_BASE_RECONNECT_DELAY_MS;
  private readonly MAX_RECONNECT_DELAY = WS_HUB_MAX_RECONNECT_DELAY_MS;

  constructor(private apiKey: string) {}

  /**
   * Зарегистрировать подписчика на пару
   * Вызывается из PriceEngineManager для каждого REAL инструмента
   */
  subscribe(pair: string, instrumentId: string, eventBus: PriceEventBus): void {
    const existing = this.subscribers.get(pair) || [];
    existing.push({ instrumentId, eventBus });
    this.subscribers.set(pair, existing);
    
    if (!this.allPairs.includes(pair)) {
      this.allPairs.push(pair);
    }
    
    logger.debug(`[RealWebSocketHub] Subscribed ${instrumentId} to pair ${pair}`);
  }

  /**
   * Удалить подписчика
   */
  unsubscribe(pair: string, instrumentId: string): void {
    const existing = this.subscribers.get(pair) || [];
    const filtered = existing.filter(s => s.instrumentId !== instrumentId);
    
    if (filtered.length > 0) {
      this.subscribers.set(pair, filtered);
    } else {
      this.subscribers.delete(pair);
      this.allPairs = this.allPairs.filter(p => p !== pair);
    }
    
    logger.debug(`[RealWebSocketHub] Unsubscribed ${instrumentId} from pair ${pair}`);
  }

  /**
   * Запуск hub - открывает одно соединение на все пары
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[RealWebSocketHub] Already running');
      return;
    }

    if (this.allPairs.length === 0) {
      logger.warn('[RealWebSocketHub] No pairs to subscribe, skipping start');
      return;
    }

    logger.info(`[RealWebSocketHub] Starting with ${this.allPairs.length} pairs: ${this.allPairs.join(', ')}`);
    this.isRunning = true;
    this.connect();
  }

  /**
   * Подключение к WebSocket
   */
  private connect(): void {
    if (!this.isRunning) return;

    try {
      this.ws = new WebSocket('wss://api.xchangeapi.com/websocket/live', {
        headers: {
          'api-key': this.apiKey,
        },
      });

      this.ws.on('open', () => {
        logger.info(`[RealWebSocketHub] WebSocket connected`);
        this.reconnectAttempt = 0; // Сброс счетчика при успешном подключении
        
        // Подписываемся на ВСЕ пары одним сообщением
        const subscribeMessage = JSON.stringify({ pairs: this.allPairs });
        logger.info(`[RealWebSocketHub] Subscribing to ${this.allPairs.length} pairs`);
        this.ws?.send(subscribeMessage);
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('error', (error: Error) => {
        logger.error({ err: error }, '[RealWebSocketHub] WebSocket error');
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        logger.warn(`[RealWebSocketHub] WebSocket closed (code: ${code}, reason: ${reason.toString()})`);
        this.ws = null;
        this.meta = null;
        this.pendingUpdates = [];
        this.timeOffsetMs = 0;
        this.offsetCalculated = false;

        // Reconnect с exponential backoff
        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });
    } catch (error) {
      logger.error({ err: error }, '[RealWebSocketHub] Failed to create WebSocket');
      if (this.isRunning) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Планирование переподключения с exponential backoff
   */
  private scheduleReconnect(): void {
    this.reconnectAttempt++;
    
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s, 60s (max)
    const delay = Math.min(
      this.BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempt - 1),
      this.MAX_RECONNECT_DELAY
    );
    
    // Добавляем jitter ±20% для предотвращения thundering herd
    const jitter = delay * 0.2 * (Math.random() - 0.5);
    const finalDelay = Math.round(delay + jitter);
    
    logger.info(`[RealWebSocketHub] Reconnecting in ${finalDelay}ms (attempt ${this.reconnectAttempt})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, finalDelay);
  }

  /**
   * Обработка сообщений
   */
  private handleMessage(data: string): void {
    if (!data || data.length === 0) {
      return;
    }

    const code = data[0];
    const payload = data.slice(1);

    // Code 0 - INIT (метаданные)
    if (code === '0') {
      this.handleInit(payload);
      return;
    }

    // Code 1 - UPDATE (обновление цены)
    if (code === '1') {
      this.handleUpdate(payload);
      return;
    }

    // Code 2 - Ping (игнорируем)
    if (code === '2') {
      return;
    }
  }

  /**
   * Обработка INIT - получаем mapping пар
   */
  private handleInit(payload: string): void {
    try {
      const meta = JSON.parse(payload) as InitMeta;
      this.meta = meta;
      
      logger.info(`[RealWebSocketHub] INIT received: session=${meta.session_uid}, pairs=${Object.keys(meta.mapping).length}`);
      logger.debug(`[RealWebSocketHub] Mapping: ${JSON.stringify(meta.mapping)}`);

      // Вычисляем начальный time offset
      const marketTimeMs = Math.floor(meta.start_time * 1000);
      const serverTimeMs = Date.now();
      this.timeOffsetMs = serverTimeMs - marketTimeMs;
      this.offsetCalculated = false;

      // Обрабатываем накопленные обновления
      if (this.pendingUpdates.length > 0) {
        logger.info(`[RealWebSocketHub] Processing ${this.pendingUpdates.length} pending updates`);
        const updates = [...this.pendingUpdates];
        this.pendingUpdates = [];
        updates.forEach(u => this.processUpdate(u, meta));
      }
    } catch (error) {
      logger.error({ err: error }, '[RealWebSocketHub] Failed to parse INIT');
    }
  }

  /**
   * Обработка UPDATE - роутинг тика подписчикам
   */
  private handleUpdate(payload: string): void {
    if (!this.meta) {
      this.pendingUpdates.push(payload);
      return;
    }
    this.processUpdate(payload, this.meta);
  }

  /**
   * Парсинг и роутинг тика
   */
  private processUpdate(payload: string, meta: InitMeta): void {
    try {
      const parts = payload.split('|');

      if (parts.length !== meta.order.length) {
        return;
      }

      // Создаем объект из частей
      const obj: Record<string, string> = {};
      meta.order.forEach((key, i) => {
        obj[key] = parts[i];
      });

      // Получаем название пары из mapping
      const pairName = meta.mapping[obj.name];
      if (!pairName) {
        return;
      }

      // Парсим цены
      const ask = Number(obj.ask);
      const bid = Number(obj.bid);
      if (isNaN(ask) || isNaN(bid)) {
        return;
      }

      const price = (ask + bid) / 2;

      // Время
      const relativeTime = Number(obj.time);
      if (isNaN(relativeTime)) {
        return;
      }

      const timestampSeconds = meta.start_time + relativeTime / meta.time_mult;
      const marketTimeMs = Math.floor(timestampSeconds * 1000);

      // Уточняем offset при первом тике
      if (!this.offsetCalculated) {
        const serverTimeMs = Date.now();
        this.timeOffsetMs = serverTimeMs - marketTimeMs;
        this.offsetCalculated = true;
        logger.debug(`[RealWebSocketHub] Time offset: ${this.timeOffsetMs}ms`);
      }

      const timestampMs = marketTimeMs + this.timeOffsetMs;

      // РОУТИНГ: отправляем тик всем подписчикам этой пары
      const subs = this.subscribers.get(pairName);
      if (!subs || subs.length === 0) {
        return;
      }

      const tick: PriceTick = {
        price,
        timestamp: timestampMs,
      };

      const event: PriceEvent = {
        type: 'price_tick',
        data: tick,
        timestamp: Date.now(),
      };

      // Эмитим в каждый EventBus подписчика
      for (const sub of subs) {
        sub.eventBus.emit(event);
      }
    } catch (error) {
      logger.error({ err: error }, '[RealWebSocketHub] Failed to process update');
    }
  }

  /**
   * Остановка hub
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('[RealWebSocketHub] Stopping...');
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
    this.timeOffsetMs = 0;
    this.offsetCalculated = false;
    this.reconnectAttempt = 0;
    
    logger.info('[RealWebSocketHub] Stopped');
  }

  /**
   * Проверка состояния
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Получить количество подписанных пар
   */
  getSubscribedPairsCount(): number {
    return this.allPairs.length;
  }
}
