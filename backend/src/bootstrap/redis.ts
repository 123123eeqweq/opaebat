/**
 * In-memory key-value store для цен и активных свечей.
 * Заменяет Redis: PriceStore (текущая цена), CandleStore (активная свеча).
 */

import { logger } from '../shared/logger.js';

export type KeyValueStore = {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
};

let store: KeyValueStore | null = null;

function createInMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    async set(key: string, value: string): Promise<void> {
      map.set(key, value);
    },
    async get(key: string): Promise<string | null> {
      const v = map.get(key);
      return v ?? null;
    },
    async del(key: string): Promise<void> {
      map.delete(key);
    },
  };
}

export async function connectRedis(): Promise<KeyValueStore> {
  if (store) {
    return store;
  }
  logger.info('Using in-memory store for prices and active candles');
  store = createInMemoryStore();
  return store;
}

export async function disconnectRedis(): Promise<void> {
  if (store) {
    logger.info('Clearing in-memory store...');
    store = null;
    logger.info('Store cleared');
  }
}

/** Возвращает in-memory store. Вызывать после connectRedis(). */
export function getRedisClient(): KeyValueStore {
  if (!store) {
    throw new Error('Store not initialized. Call connectRedis() first.');
  }
  return store;
}
