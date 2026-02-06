/**
 * Bull queue definitions
 * Trade closing, email, reports, cleanup - all use Redis-backed queues
 */

import Bull from 'bull';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

export const QUEUE_NAMES = {
  TRADE_CLOSING: 'trade-closing',
  EMAIL: 'email',
  REPORTS: 'reports',
  CLEANUP: 'cleanup',
} as const;

/** All queues for Bull Board - populated when Redis is available */
const queues: Bull.Queue[] = [];

/**
 * Create trade closing queue (repeatable job every 1s)
 */
export function createTradeClosingQueue(): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  try {
    const queue = new Bull(QUEUE_NAMES.TRADE_CLOSING, env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
      },
    });

    queue.on('error', (err) => logger.error('Trade closing queue error:', err));
    queue.on('failed', (job, err) =>
      logger.error(`Trade closing job ${job?.id} failed:`, err)
    );

    queues.push(queue);
    return queue;
  } catch (err) {
    logger.error('Failed to create trade closing queue:', err);
    return null;
  }
}

/**
 * Create email queue (for async email sending)
 */
export function createEmailQueue(): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  try {
    const queue = new Bull(QUEUE_NAMES.EMAIL, env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 500,
      },
    });
    queues.push(queue);
    return queue;
  } catch (err) {
    logger.error('Failed to create email queue:', err);
    return null;
  }
}

/**
 * Create cleanup queue (old sessions, candles, temp tokens)
 */
export function createCleanupQueue(): Bull.Queue | null {
  if (!env.REDIS_URL) return null;

  try {
    const queue = new Bull(QUEUE_NAMES.CLEANUP, env.REDIS_URL, {
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: 50,
      },
    });
    queues.push(queue);
    return queue;
  } catch (err) {
    logger.error('Failed to create cleanup queue:', err);
    return null;
  }
}

/**
 * Get all queues for Bull Board
 */
export function getQueues(): Bull.Queue[] {
  return queues;
}

/**
 * Close all queues (graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all(queues.map((q) => q.close()));
  queues.length = 0;
}
