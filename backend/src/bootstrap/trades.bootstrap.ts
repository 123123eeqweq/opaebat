/**
 * Trades bootstrap - starts trade closing runner
 */

import { TradeClosingService } from '../domain/trades/TradeClosingService.js';
import { PrismaTradeRepository } from '../infrastructure/prisma/PrismaTradeRepository.js';
import { PrismaAccountRepository } from '../infrastructure/prisma/PrismaAccountRepository.js';
import { PriceServiceAdapter } from '../infrastructure/pricing/PriceServiceAdapter.js';
import { getPriceEngineManager } from './prices.bootstrap.js';
import { logger } from '../shared/logger.js';

let closingService: TradeClosingService | null = null;
let closingInterval: NodeJS.Timeout | null = null;

const CLOSING_INTERVAL_MS = 1000; // Check every 1 second

export async function bootstrapTrades(): Promise<void> {
  if (closingInterval) {
    logger.warn('Trade closing runner already started');
    return;
  }

  logger.info('🚀 Bootstrapping trade closing service...');

  // Initialize dependencies
  // Price service should be initialized by now (bootstrapPrices is called before)
  const tradeRepository = new PrismaTradeRepository();
  const accountRepository = new PrismaAccountRepository();
  
  try {
    const manager = getPriceEngineManager();
    const priceProvider = new PriceServiceAdapter(manager);
    closingService = new TradeClosingService(tradeRepository, accountRepository, priceProvider);
  } catch (error) {
    logger.error('Failed to initialize trade closing service - price service not available:', error);
    throw error;
  }

  // Start periodic runner
  closingInterval = setInterval(async () => {
    try {
      await closingService!.closeExpiredTrades();
    } catch (error) {
      logger.error('Error in trade closing runner:', error);
    }
  }, CLOSING_INTERVAL_MS);

  logger.info('✅ Trade closing service bootstrapped');
}

export async function shutdownTrades(): Promise<void> {
  if (closingInterval) {
    logger.info('🛑 Shutting down trade closing service...');
    clearInterval(closingInterval);
    closingInterval = null;
    closingService = null;
    logger.info('✅ Trade closing service shut down');
  }
}
