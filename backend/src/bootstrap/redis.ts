/**
 * Redis key-value store для цен и активных свечей.
 * PriceStore (текущая цена), CandleStore (активная свеча).
 */

import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

export type KeyValueStore = {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
};

let redis: Redis | null = null;
let store: KeyValueStore | null = null;

const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6379';

function createKeyValueStore(client: Redis): KeyValueStore {
  return {
    async set(key: string, value: string): Promise<void> {
      await client.set(key, value);
    },
    async get(key: string): Promise<string | null> {
      return await client.get(key);
    },
    async del(key: string): Promise<void> {
      await client.del(key);
    },
  };
}

export async function connectRedis(): Promise<KeyValueStore> {
  if (store) {
    return store;
  }

  const url = env.REDIS_URL || DEFAULT_REDIS_URL;
  redis = new Redis(url);

  redis.on('connect', () => {
    logger.info(`Connected to Redis at ${url}`);
  });

  redis.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  await new Promise<void>((resolve, reject) => {
    if (!redis) return reject(new Error('Redis client not created'));
    redis.once('ready', resolve);
    redis.once('error', reject);
  });

  store = createKeyValueStore(redis);
  return store;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    store = null;
    logger.info('Redis disconnected');
  }
}

/** Возвращает Redis store. Вызывать после connectRedis(). */
export function getRedisClient(): KeyValueStore {
  if (!store) {
    throw new Error('Store not initialized. Call connectRedis() first.');
  }
  return store;
}
