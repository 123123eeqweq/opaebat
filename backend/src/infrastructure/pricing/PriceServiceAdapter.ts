/**
 * Price Service Adapter - implements PriceProvider port
 * FLOW P2: uses PriceEngineManager, maps asset/symbol to instrumentId
 */

import type { PriceProvider } from '../../ports/pricing/PriceProvider.js';
import type { PriceEngineManager } from '../../prices/PriceEngineManager.js';
import { getInstrumentIdBySymbol } from '../../config/instruments.js';

export class PriceServiceAdapter implements PriceProvider {
  constructor(private manager: PriceEngineManager) {}

  async getCurrentPrice(assetOrInstrumentId: string): Promise<{
    price: number;
    timestamp: number;
  } | null> {
    const instrumentId = getInstrumentIdBySymbol(assetOrInstrumentId);
    const tick = await this.manager.getCurrentPrice(instrumentId);

    if (!tick) {
      return null;
    }

    return {
      price: tick.price,
      timestamp: tick.timestamp,
    };
  }
}
