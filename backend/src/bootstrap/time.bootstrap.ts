/**
 * Time bootstrap - sends trade countdown updates via WebSocket
 */

import { getWebSocketManager } from '../modules/websocket/websocket.routes.js';
import { SystemClock } from '../infrastructure/time/SystemClock.js';
import { TimeService } from '../domain/time/TimeService.js';
import { logger } from '../shared/logger.js';

let countdownInterval: NodeJS.Timeout | null = null;
let timeService: TimeService | null = null;

// Store active trades for countdown updates
// This is a simple cache to track which trades need countdown updates
const activeTradesCache = new Map<string, { userId: string; expiresAt: number }>();

const COUNTDOWN_INTERVAL_MS = 1000; // Every 1 second

export async function bootstrapTimeUpdates(): Promise<void> {
  if (countdownInterval) {
    logger.warn('Time updates already bootstrapped');
    return;
  }

  logger.info('🚀 Bootstrapping time updates (trade countdown)...');

  // Initialize time service
  const clock = new SystemClock();
  timeService = new TimeService(clock);

  // Start countdown interval
  countdownInterval = setInterval(async () => {
    try {
      await sendTradeCountdowns();
    } catch (error) {
      logger.error('Error in trade countdown update:', error);
    }
  }, COUNTDOWN_INTERVAL_MS);

  logger.info('✅ Time updates bootstrapped');
}

export async function shutdownTimeUpdates(): Promise<void> {
  if (countdownInterval) {
    logger.info('🛑 Shutting down time updates...');
    clearInterval(countdownInterval);
    countdownInterval = null;
    timeService = null;
    activeTradesCache.clear();
    logger.info('✅ Time updates shut down');
  }
}

/**
 * Register trade for countdown updates
 */
export function registerTradeForCountdown(tradeId: string, userId: string, expiresAt: number): void {
  activeTradesCache.set(tradeId, { userId, expiresAt });
}

/**
 * Unregister trade from countdown updates
 */
export function unregisterTradeFromCountdown(tradeId: string): void {
  activeTradesCache.delete(tradeId);
}

/**
 * Send countdown updates for all active trades
 */
async function sendTradeCountdowns(): Promise<void> {
  if (!timeService) {
    return;
  }

  const wsManager = getWebSocketManager();

  // Send countdown for each active trade
  for (const [tradeId, tradeInfo] of activeTradesCache.entries()) {
    const secondsLeft = timeService.secondsLeft(tradeInfo.expiresAt);

    if (secondsLeft > 0) {
      // Trade still has time left
      wsManager.sendToUser(tradeInfo.userId, {
        type: 'trade:countdown',
        data: {
          tradeId,
          secondsLeft,
        },
      });
    } else {
      // Trade expired, remove from cache
      activeTradesCache.delete(tradeId);
    }
  }
}
