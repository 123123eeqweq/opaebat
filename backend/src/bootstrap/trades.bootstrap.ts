/**
 * Trades bootstrap - starts trade closing runner
 * Uses Bull queue when REDIS_URL is set, otherwise setInterval fallback
 */

import { TradeClosingService } from '../domain/trades/TradeClosingService.js';
import { PrismaTradeRepository } from '../infrastructure/prisma/PrismaTradeRepository.js';
import { PrismaAccountRepository } from '../infrastructure/prisma/PrismaAccountRepository.js';
import { PrismaTransactionRepository } from '../infrastructure/prisma/PrismaTransactionRepository.js';
import { PriceServiceAdapter } from '../infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from './prices.bootstrap.js';
import { logger } from '../shared/logger.js';
import { AccountService } from '../domain/accounts/AccountService.js';
import { createTradeClosingQueue, closeAllQueues } from '../jobs/queues.js';
import { env } from '../config/env.js';

let closingService: TradeClosingService | null = null;
let closingInterval: NodeJS.Timeout | null = null;
let tradeClosingQueue: ReturnType<typeof createTradeClosingQueue> = null;

const CLOSING_INTERVAL_MS = 1000; // Check every 1 second

export async function bootstrapTrades(): Promise<void> {
  if (closingInterval || tradeClosingQueue) {
    logger.warn('Trade closing runner already started');
    return;
  }

  logger.info('🚀 Bootstrapping trade closing service...');

  // Initialize dependencies
  const tradeRepository = new PrismaTradeRepository();
  const accountRepository = new PrismaAccountRepository();
  const transactionRepository = new PrismaTransactionRepository();
  const accountService = new AccountService(accountRepository, transactionRepository);

  try {
    const manager = getPriceEngineManager();
    const priceProvider = new PriceServiceAdapter(manager);
    closingService = new TradeClosingService(
      tradeRepository,
      accountRepository,
      priceProvider,
      accountService
    );
  } catch (error) {
    logger.error('Failed to initialize trade closing service - price service not available:', error);
    throw error;
  }

  if (env.REDIS_URL) {
    // Bull queue: retry on failure, job prioritization, monitoring via Bull Board
    const queue = createTradeClosingQueue();
    if (queue) {
      tradeClosingQueue = queue;

      queue.process(async () => {
        try {
          await closingService!.closeExpiredTrades();
        } catch (error) {
          logger.error('Error in trade closing job:', error);
          throw error; // Re-throw so Bull can retry
        }
      });

      await queue.add({}, { repeat: { every: CLOSING_INTERVAL_MS } });
      logger.info('✅ Trade closing service bootstrapped (Bull queue)');
    } else {
      logger.warn('Bull queue creation failed, falling back to setInterval');
      startSetIntervalRunner();
    }
  } else {
    // Fallback: primitive setInterval when Redis not available
    logger.info('REDIS_URL not set, using setInterval for trade closing');
    startSetIntervalRunner();
  }

  if (!tradeClosingQueue && !closingInterval) {
    logger.warn('Trade closing runner not started');
  }
}

function startSetIntervalRunner(): void {
  closingInterval = setInterval(async () => {
    try {
      await closingService!.closeExpiredTrades();
    } catch (error) {
      logger.error('Error in trade closing runner:', error);
    }
  }, CLOSING_INTERVAL_MS);
  logger.info('✅ Trade closing service bootstrapped (setInterval)');
}

export async function shutdownTrades(): Promise<void> {
  if (closingInterval) {
    logger.info('🛑 Shutting down trade closing service (setInterval)...');
    clearInterval(closingInterval);
    closingInterval = null;
  }

  if (tradeClosingQueue) {
    logger.info('🛑 Shutting down trade closing queue...');
    tradeClosingQueue = null;
  }

  await closeAllQueues();
  closingService = null;
  logger.info('✅ Trade closing service shut down');
}
